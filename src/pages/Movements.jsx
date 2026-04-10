import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../App';
import { Card, Button, Input, Select, Modal, Badge, StatCard, EmptyState } from '../components/UI';
import { FARMS, CATEGORIES, CULTURES, MELANGES_PREDEFINIS, FARM_CULTURES } from '../lib/constants';
import { fmt, fmtMoney, downloadExcel, today } from '../lib/utils';
import { getSuppliers, addSupplier, getAveragePrice, calculateFarmStock, calculateWarehouseStock, getMelangeHistory, addMelangeToHistory, cancelMelange, updateMelangeInHistory, getMovements } from '../lib/store';

const Movements = () => {
  const { products, movements, addMovement, updateMovement, deleteMovement, showNotif, loadData, readOnly } = useApp();
  const suppliers = getSuppliers();
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterFarm, setFilterFarm] = useState('ALL');
  const [filterSupplier, setFilterSupplier] = useState('ALL');
  const [filterCulture, setFilterCulture] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('entry'); // entry, exit, consumption, transfer
  const [consoMode, setConsoMode] = useState('simple');
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [form, setForm] = useState({
    product: '', quantity: '', price: '', supplier: '', farm: '', date: today(), culture: '', destination: 'Sol',
    fromFarm: FARMS[0]?.id || '', toFarm: FARMS[1]?.id || ''
  });
  
  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);

  // Melange states
  const [selectedMelange, setSelectedMelange] = useState('Myrtille Sol');
  const [editableProduits, setEditableProduits] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [expandedMelangeId, setExpandedMelangeId] = useState(null);
  const [editingMelange, setEditingMelange] = useState(null);
  const [editMelangeProducts, setEditMelangeProducts] = useState([]);
  const [melangeHistory, setMelangeHistory] = useState([]);
  const [newProductName, setNewProductName] = useState('');
  const [newProductQty, setNewProductQty] = useState('');

  // Load melange history
  useEffect(() => {
    setMelangeHistory(getMelangeHistory());
  }, []);

  // Calculate stock for source farm (for transfers)
  const sourceStock = useMemo(() => {
    if (!form.fromFarm) return {};
    return calculateFarmStock(form.fromFarm);
  }, [form.fromFarm, movements]);

  // Calculate stock for destination farm (for consumption)
  const consoStock = useMemo(() => {
    if (!form.farm) return {};
    return calculateFarmStock(form.farm);
  }, [form.farm, movements]);

  // Calculate warehouse stock (for exits)
  const warehouseStock = useMemo(() => {
    return calculateWarehouseStock();
  }, [movements]);

  // Get stock quantity for selected product in source farm (transfers)
  const productStockInSource = useMemo(() => {
    if (!form.product || !form.fromFarm) return null;
    const stock = sourceStock[form.product];
    return stock ? stock.quantity : 0;
  }, [form.product, form.fromFarm, sourceStock]);

  // Get stock quantity for selected product in farm (consumption)
  const productStockForConso = useMemo(() => {
    if (!form.product || !form.farm) return null;
    const stock = consoStock[form.product];
    return stock ? stock.quantity : 0;
  }, [form.product, form.farm, consoStock]);

  // Get stock quantity for selected product in warehouse (exits)
  const productStockInWarehouse = useMemo(() => {
    if (!form.product) return null;
    const stock = warehouseStock[form.product];
    return stock ? stock.quantity : 0;
  }, [form.product, warehouseStock]);

  // Get product unit
  const getProductUnit = (productName) => {
    const product = products.find(p => p.name === productName);
    return product?.unit || 'KG';
  };

  // Filter movements
  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const matchSearch = !search || m.product?.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === 'ALL' || m.type === filterType || 
        (filterType === 'transfer' && (m.type === 'transfer-in' || m.type === 'transfer-out'));
      const matchFarm = filterFarm === 'ALL' || m.farm === filterFarm;
      const matchSupplier = filterSupplier === 'ALL' || m.supplier === filterSupplier;
      const matchCulture = filterCulture === 'ALL' || m.culture === filterCulture;
      
      let matchCategory = filterCategory === 'ALL';
      if (!matchCategory) {
        const product = products.find(p => p.name === m.product);
        matchCategory = product?.category === filterCategory;
      }
      
      const matchDateFrom = !dateFrom || (m.date && m.date >= dateFrom);
      const matchDateTo = !dateTo || (m.date && m.date <= dateTo);
      
      return matchSearch && matchType && matchCategory && matchFarm && matchSupplier && matchCulture && matchDateFrom && matchDateTo;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [movements, products, search, filterType, filterCategory, filterFarm, filterSupplier, filterCulture, dateFrom, dateTo]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);
  const paginatedMovements = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMovements.slice(start, start + itemsPerPage);
  }, [filteredMovements, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType, filterCategory, filterFarm, filterSupplier, filterCulture, dateFrom, dateTo]);

  // Stats
  const stats = useMemo(() => {
    const entries = filteredMovements.filter(m => m.type === 'entry');
    const exits = filteredMovements.filter(m => m.type === 'exit');
    const consos = filteredMovements.filter(m => m.type === 'consumption');
    const transfers = filteredMovements.filter(m => m.type === 'transfer-in' || m.type === 'transfer-out');
    
    return {
      totalEntries: entries.reduce((s, m) => s + ((m.quantity || 0) * (m.price || 0)), 0),
      totalEntriesQty: entries.reduce((s, m) => s + (m.quantity || 0), 0),
      totalExits: exits.reduce((s, m) => s + (m.quantity || 0), 0),
      totalExitsValue: exits.reduce((s, m) => s + ((m.quantity || 0) * (m.price || 0)), 0),
      totalConso: consos.reduce((s, m) => s + ((m.quantity || 0) * (m.price || 0)), 0),
      nbEntries: entries.length,
      nbExits: exits.length,
      nbConsos: consos.length,
      nbTransfers: transfers.filter(t => t.type === 'transfer-in').length
    };
  }, [filteredMovements]);

  // Available melanges based on selected farm and culture
  const availableMelanges = useMemo(() => {
    let melanges = Object.entries(MELANGES_PREDEFINIS);
    melanges = melanges.filter(([key, m]) => m.culture === form.culture);
    if (form.farm === 'AGRO BERRY 3') {
      melanges = melanges.filter(([key, m]) => m.type === 'Hydro');
    }
    return melanges;
  }, [form.farm, form.culture]);

  // Current melange
  const currentMelange = useMemo(() => MELANGES_PREDEFINIS[selectedMelange], [selectedMelange]);

  // Farm stock for melange validation
  const farmStock = useMemo(() => calculateFarmStock(form.farm), [form.farm, movements]);

  // Load melange products when melange changes
  useEffect(() => {
    if (currentMelange && consoMode === 'melange') {
      setEditableProduits(currentMelange.produits.map((p, i) => ({
        id: i,
        nom: p.nom,
        qte: p.qte,
        unite: p.unite,
        enabled: true,
        price: getAveragePrice(p.nom) || 0,
        stock: farmStock[p.nom]?.quantity || 0,
        isCustom: false
      })));
    }
  }, [selectedMelange, currentMelange, consoMode, farmStock]);

  // When farm or culture changes for melange
  useEffect(() => {
    if (consoMode === 'melange') {
      if (form.culture === 'Fraise') {
        setSelectedMelange('Fraise Sol');
      } else if (form.farm === 'AGRO BERRY 3') {
        setSelectedMelange('Myrtille Hydro');
      } else if (selectedMelange.includes('Fraise')) {
        setSelectedMelange('Myrtille Sol');
      }
    }
  }, [form.farm, form.culture, consoMode]);

  const openModal = (type) => {
    setModalType(type);
    setConsoMode('simple');
    setForm({
      product: '', quantity: '', price: '', supplier: '', farm: FARMS[0]?.id || '', 
      date: today(), culture: 'Myrtille', destination: 'Sol',
      fromFarm: FARMS[0]?.id || '', toFarm: FARMS[1]?.id || ''
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!form.product || !form.quantity) {
      showNotif('Produit et quantité requis', 'error');
      return;
    }
    
    // Get supplier name (from select or new input)
    const supplierName = showNewSupplier ? newSupplierName.trim() : form.supplier;
    
    // Validate supplier for entry
    if (modalType === 'entry' && !supplierName) {
      showNotif('Fournisseur requis', 'error');
      return;
    }
    
    // Validate stock for consumption - cannot go negative
    if (modalType === 'consumption' && form.farm) {
      const farmStock = calculateFarmStock(form.farm);
      const currentStock = farmStock[form.product]?.quantity || 0;
      const qty = parseFloat(form.quantity);
      if (qty > currentStock) {
        showNotif(`Stock insuffisant ! Disponible: ${fmt(currentStock)} ${getProductUnit(form.product)}`, 'error');
        return;
      }
    }
    
    // Validate stock for exit - cannot go negative in warehouse
    if (modalType === 'exit') {
      const whStock = calculateWarehouseStock();
      const currentStock = whStock[form.product]?.quantity || 0;
      const qty = parseFloat(form.quantity);
      if (qty > currentStock) {
        showNotif(`Stock magasin insuffisant ! Disponible: ${fmt(currentStock)} ${getProductUnit(form.product)}`, 'error');
        return;
      }
    }
    
    // Add new supplier to list if needed
    if (showNewSupplier && newSupplierName.trim()) {
      addSupplier(newSupplierName.trim());
    }
    
    const price = form.price || getAveragePrice(form.product) || 0;
    
    addMovement({
      type: modalType,
      product: form.product,
      quantity: parseFloat(form.quantity),
      price: parseFloat(price),
      supplier: modalType === 'entry' ? supplierName : undefined,
      farm: modalType !== 'entry' ? form.farm : undefined,
      date: form.date,
      culture: modalType === 'consumption' ? form.culture : undefined,
      destination: modalType === 'consumption' ? form.destination : undefined
    });
    
    showNotif(`${modalType === 'entry' ? 'Entrée' : modalType === 'exit' ? 'Sortie' : 'Consommation'} enregistrée`);
    setShowModal(false);
    setShowNewSupplier(false);
    setNewSupplierName('');
  };

  // Transfer submit
  const handleTransferSubmit = () => {
    if (!form.product || !form.quantity || !form.fromFarm || !form.toFarm) {
      showNotif('Remplir tous les champs', 'error');
      return;
    }

    // Validate stock - cannot transfer more than available
    const sourceStock = calculateFarmStock(form.fromFarm);
    const currentStock = sourceStock[form.product]?.quantity || 0;
    const qty = parseFloat(form.quantity);
    
    if (qty > currentStock) {
      showNotif(`Stock insuffisant ! Disponible: ${fmt(currentStock)} ${getProductUnit(form.product)}`, 'error');
      return;
    }

    const price = getAveragePrice(form.product) || 0;
    const transferId = Date.now(); // Link both movements

    // Sortie de la ferme source
    addMovement({
      type: 'transfer-out',
      product: form.product,
      quantity: qty,
      price,
      farm: form.fromFarm,
      toFarm: form.toFarm,
      date: form.date,
      transferId
    });

    // Entrée dans la ferme destination
    addMovement({
      type: 'transfer-in',
      product: form.product,
      quantity: qty,
      price,
      farm: form.toFarm,
      fromFarm: form.fromFarm,
      date: form.date,
      transferId
    });

    showNotif('✅ Transfert enregistré');
    setShowModal(false);
  };

  // Melange functions
  const updateProduit = (id, field, value) => 
    setEditableProduits(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  
  const toggleProduit = (id) => 
    setEditableProduits(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));

  const removeProduit = (id) => 
    setEditableProduits(prev => prev.filter(p => p.id !== id));

  const addProduit = () => {
    if (!newProductName) {
      showNotif('Sélectionnez un produit', 'error');
      return;
    }
    const existing = editableProduits.find(p => p.nom.toUpperCase() === newProductName.toUpperCase());
    if (existing) {
      showNotif('Produit déjà dans la liste', 'error');
      return;
    }
    const price = getAveragePrice(newProductName) || 0;
    const stock = farmStock[newProductName]?.quantity || 0;
    setEditableProduits(prev => [...prev, {
      id: Date.now(),
      nom: newProductName,
      qte: parseFloat(newProductQty) || 0,
      unite: 'KG',
      enabled: true,
      price,
      stock,
      isCustom: true
    }]);
    setNewProductName('');
    setNewProductQty('');
  };

  const enabledProduits = editableProduits.filter(p => p.enabled && p.qte > 0);
  const totalMelangeCost = enabledProduits.reduce((sum, p) => sum + (parseFloat(p.qte) || 0) * (p.price || 0), 0);
  const totalMelangeQty = enabledProduits.reduce((sum, p) => sum + (parseFloat(p.qte) || 0), 0);

  const handleMelangeSubmit = () => {
    if (enabledProduits.length === 0) {
      showNotif('Aucun produit sélectionné', 'error');
      return;
    }

    const insufficientStock = enabledProduits.filter(p => p.qte > (farmStock[p.nom]?.quantity || 0));
    if (insufficientStock.length > 0) {
      const names = insufficientStock.map(p => p.nom).join(', ');
      if (!confirm(`Stock insuffisant pour: ${names}. Continuer quand même ?`)) {
        return;
      }
    }

    const melangeId = Date.now();
    
    enabledProduits.forEach(p => {
      addMovement({
        type: 'consumption',
        product: p.nom,
        quantity: parseFloat(p.qte),
        price: p.price || 0,
        farm: form.farm,
        date: form.date,
        culture: form.culture,
        destination: currentMelange?.type || 'Sol',
        notes: `Mélange: ${selectedMelange}`,
        melangeId: melangeId
      });
    });

    addMelangeToHistory({
      id: melangeId,
      name: selectedMelange,
      farm: form.farm,
      culture: form.culture,
      date: form.date,
      produits: enabledProduits.map(p => ({ nom: p.nom, qte: p.qte, price: p.price })),
      totalCost: totalMelangeCost,
      totalQty: totalMelangeQty,
      type: currentMelange?.type || 'Sol'
    });

    setMelangeHistory(getMelangeHistory());
    showNotif(`✅ Mélange "${selectedMelange}" appliqué (${enabledProduits.length} produits)`);
    loadData();
    setShowModal(false);
  };

  const handleCancelMelange = (melangeId) => {
    if (!confirm('Annuler ce mélange ? Les mouvements de consommation seront supprimés.')) return;
    
    const removed = cancelMelange(melangeId);
    setMelangeHistory(getMelangeHistory());
    loadData();
    showNotif(`✅ Mélange annulé (${removed} mouvements supprimés)`);
  };

  const handleEditMelange = (melange) => {
    // Load the melange for editing
    setEditingMelange(melange);
    // Initialize products with their current quantities
    const productsWithStock = (melange.produits || []).map(p => {
      const product = products.find(pr => pr.name === p.nom);
      return {
        nom: p.nom,
        qte: p.qte,
        price: p.price || product?.price || 0
      };
    });
    setEditMelangeProducts(productsWithStock);
    setShowHistoryModal(false);
  };

  const handleSaveEditMelange = () => {
    if (!editingMelange) return;
    
    // Validate quantities
    const validProducts = editMelangeProducts.filter(p => p.qte > 0);
    if (validProducts.length === 0) {
      showNotif('⚠️ Ajoutez au moins un produit avec une quantité > 0', 'warning');
      return;
    }

    // Delete old movements for this melange
    cancelMelange(editingMelange.id);

    // Create new movements with updated quantities
    const melangeId = editingMelange.id;
    validProducts.forEach(p => {
      addMovement({
        type: 'consumption',
        product: p.nom,
        quantity: parseFloat(p.qte),
        price: p.price || 0,
        farm: editingMelange.farm,
        date: editingMelange.date,
        culture: editingMelange.culture,
        destination: editingMelange.type || 'Sol',
        notes: `Mélange: ${editingMelange.name}`,
        melangeId: melangeId
      });
    });

    // Update melange history
    const totalCost = validProducts.reduce((sum, p) => sum + (p.qte * p.price), 0);
    const totalQty = validProducts.reduce((sum, p) => sum + parseFloat(p.qte), 0);
    
    updateMelangeInHistory(melangeId, {
      produits: validProducts,
      totalCost,
      totalQty,
      cancelled: false
    });

    setMelangeHistory(getMelangeHistory());
    loadData();
    setEditingMelange(null);
    setEditMelangeProducts([]);
    showNotif(`✅ Mélange "${editingMelange.name}" modifié`);
  };

  const handleCancelEditMelange = () => {
    setEditingMelange(null);
    setEditMelangeProducts([]);
  };

  const handleDelete = (id) => {
    // Find the movement to check if it's a transfer
    const movement = movements.find(m => m.id === id);
    
    if (movement && (movement.type === 'transfer-in' || movement.type === 'transfer-out')) {
      if (confirm('Supprimer ce transfert ? Les deux opérations (source et destination) seront supprimées.')) {
        // Delete both transfer movements with same transferId
        if (movement.transferId) {
          const paired = movements.filter(m => m.transferId === movement.transferId);
          paired.forEach(m => deleteMovement(m.id));
        } else {
          // Fallback: find paired movement by date, product, quantity
          const paired = movements.find(m => 
            m.id !== id &&
            (m.type === 'transfer-in' || m.type === 'transfer-out') &&
            m.date === movement.date &&
            m.product === movement.product &&
            m.quantity === movement.quantity
          );
          deleteMovement(id);
          if (paired) deleteMovement(paired.id);
        }
      }
    } else {
      if (confirm('Supprimer ce mouvement ?')) {
        deleteMovement(id);
      }
    }
  };

  // Handle edit
  const handleEdit = (movement) => {
    setEditingMovement({
      ...movement,
      quantity: movement.quantity?.toString() || '',
      price: movement.price?.toString() || ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = () => {
    if (!editingMovement) return;
    
    const newQty = parseFloat(editingMovement.quantity) || 0;
    const newPrice = parseFloat(editingMovement.price) || 0;
    const newDate = editingMovement.date;
    
    // Update main movement
    updateMovement(editingMovement.id, {
      product: editingMovement.product,
      date: newDate,
      quantity: newQty,
      price: newPrice,
      supplier: editingMovement.supplier,
      farm: editingMovement.farm,
      culture: editingMovement.culture
    });
    
    // If it's a transfer, also update the paired movement
    if (editingMovement.type === 'transfer-in' || editingMovement.type === 'transfer-out') {
      // Find paired movement by transferId or by matching criteria
      const allMovements = getMovements();
      let pairedMovement = null;
      
      if (editingMovement.transferId) {
        pairedMovement = allMovements.find(m => 
          m.transferId === editingMovement.transferId && m.id !== editingMovement.id
        );
      }
      
      // Fallback: find by source/destination farms and product
      if (!pairedMovement) {
        const oppositeType = editingMovement.type === 'transfer-in' ? 'transfer-out' : 'transfer-in';
        pairedMovement = allMovements.find(m =>
          m.id !== editingMovement.id &&
          m.type === oppositeType &&
          m.product === editingMovement.product &&
          m.fromFarm === editingMovement.fromFarm &&
          m.toFarm === editingMovement.toFarm
        );
      }
      
      // Second fallback: find by product and opposite type created around same time
      if (!pairedMovement) {
        const oppositeType = editingMovement.type === 'transfer-in' ? 'transfer-out' : 'transfer-in';
        // Look for movements with IDs close to each other (created together)
        pairedMovement = allMovements.find(m =>
          m.id !== editingMovement.id &&
          m.type === oppositeType &&
          m.product === editingMovement.product &&
          Math.abs(m.id - editingMovement.id) < 1000 // Created within ~1 second
        );
      }
      
      if (pairedMovement) {
        updateMovement(pairedMovement.id, {
          date: newDate,
          quantity: newQty,
          price: newPrice
        });
        console.log('✅ Mouvement lié mis à jour:', pairedMovement.id);
      } else {
        console.warn('⚠️ Mouvement lié non trouvé pour le transfert');
      }
    }
    
    loadData();
    setShowEditModal(false);
    setEditingMovement(null);
    showNotif('✅ Mouvement modifié');
  };

  const handleExport = async () => {
    const data = filteredMovements.map(m => ({
      Date: m.date,
      Type: m.type === 'entry' ? 'Entrée' : m.type === 'exit' ? 'Sortie' : m.type === 'consumption' ? 'Consommation' : 'Transfert',
      Produit: m.product,
      Quantité: m.quantity,
      Prix: m.price,
      Valeur: (m.quantity || 0) * (m.price || 0),
      Fournisseur: m.supplier || '',
      Ferme: m.farm || '',
      Culture: m.culture || ''
    }));
    await downloadExcel(data, 'mouvements.xlsx');
  };

  const resetFilters = () => {
    setSearch(''); setFilterType('ALL'); setFilterCategory('ALL');
    setFilterFarm('ALL'); setFilterSupplier('ALL'); setFilterCulture('ALL');
    setDateFrom(''); setDateTo('');
  };

  const getTypeInfo = (type) => {
    const types = {
      entry: { label: 'Entrée', color: 'green', icon: '📥' },
      exit: { label: 'Sortie', color: 'blue', icon: '📤' },
      consumption: { label: 'Conso', color: 'red', icon: '🔥' },
      'transfer-in': { label: 'Reçu', color: 'purple', icon: '📥' },
      'transfer-out': { label: 'Envoyé', color: 'orange', icon: '📤' }
    };
    return types[type] || { label: type, color: 'gray', icon: '📦' };
  };

  const activeMelanges = melangeHistory.filter(m => !m.cancelled).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mouvements</h1>
          <p className="text-gray-500 mt-1">{filteredMovements.length} mouvements affichés</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleExport}>📥 Export</Button>
          {!readOnly && <>
            <Button onClick={() => openModal('entry')}>📥 Entrée</Button>
            <Button variant="blue" onClick={() => openModal('exit')}>📤 Sortie</Button>
            <Button variant="danger" onClick={() => openModal('consumption')}>🔥 Conso</Button>
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => openModal('transfer')}>↔️ Transfert</Button>
          </>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon="📥" label="Entrées" value={fmtMoney(stats.totalEntries)} subValue={`${stats.nbEntries} opérations`} color="green" />
        <StatCard icon="📤" label="Sorties" value={fmt(stats.totalExits)} subValue={`${stats.nbExits} opérations`} color="blue" />
        <StatCard icon="🔥" label="Consommation" value={fmtMoney(stats.totalConso)} subValue={`${stats.nbConsos} opérations`} color="red" />
        <StatCard icon="↔️" label="Transferts" value={stats.nbTransfers} subValue="transferts" color="purple" />
        <StatCard icon="📊" label="Total" value={filteredMovements.length} subValue="mouvements" color="gray" />
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="🔍 Rechercher produit..." value={search} onChange={setSearch} />
          </div>
          <Select value={filterType} onChange={setFilterType} className="w-36"
            options={[
              { value: 'ALL', label: '📦 Tous' },
              { value: 'entry', label: '📥 Entrées' },
              { value: 'exit', label: '📤 Sorties' },
              { value: 'consumption', label: '🔥 Conso' },
              { value: 'transfer', label: '↔️ Transferts' }
            ]} />
          <Select value={filterFarm} onChange={setFilterFarm} className="w-40"
            options={[
              { value: 'ALL', label: '🏭 Toutes fermes' },
              ...FARMS.map(f => ({ value: f.id, label: f.short }))
            ]} />
          <Button variant="secondary" onClick={resetFilters}>🔄 Reset</Button>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Select value={filterCategory} onChange={setFilterCategory} className="w-44"
            options={[
              { value: 'ALL', label: '📁 Toutes catégories' },
              ...CATEGORIES.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))
            ]} />
          <Select value={filterCulture} onChange={setFilterCulture} className="w-36"
            options={[
              { value: 'ALL', label: '🌱 Cultures' },
              ...CULTURES.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))
            ]} />
          <Input type="date" value={dateFrom} onChange={setDateFrom} placeholder="Du" className="w-36" />
          <Input type="date" value={dateTo} onChange={setDateTo} placeholder="Au" className="w-36" />
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        {filteredMovements.length === 0 ? (
          <div className="p-6">
            <EmptyState icon="📋" message="Aucun mouvement trouvé" action={
              <Button onClick={resetFilters}>Réinitialiser filtres</Button>
            } />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Produit</th>
                  <th className="text-right">Quantité</th>
                  <th className="text-right">P.U</th>
                  <th className="text-right">Valeur</th>
                  <th>Détail</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedMovements.map((m, idx) => {
                  const typeInfo = getTypeInfo(m.type);
                  const value = (m.quantity || 0) * (m.price || 0);
                  
                  // Build detail text
                  let detailText = '-';
                  if (m.supplier) {
                    detailText = m.supplier;
                  } else if (m.type === 'transfer-out') {
                    const from = m.farm?.replace('AGRO BERRY ', 'AB') || '?';
                    const to = m.toFarm?.replace('AGRO BERRY ', 'AB') || '?';
                    detailText = <span><span className="text-orange-600 font-medium">De:</span> {from} <span className="text-green-600 font-medium">→ Vers:</span> {to}</span>;
                  } else if (m.type === 'transfer-in') {
                    const from = m.fromFarm?.replace('AGRO BERRY ', 'AB') || '?';
                    const to = m.farm?.replace('AGRO BERRY ', 'AB') || '?';
                    detailText = <span><span className="text-orange-600 font-medium">De:</span> {from} <span className="text-green-600 font-medium">→ Vers:</span> {to}</span>;
                  } else if (m.farm) {
                    const farmShort = m.farm.replace('AGRO BERRY ', 'AB');
                    // Show culture with destination type for Myrtille
                    let cultureText = m.culture || '';
                    if (m.culture === 'Myrtille' && m.destination) {
                      const destShort = m.destination === 'Hydroponic' || m.destination === 'Hydro' ? 'Hydro' : m.destination;
                      cultureText = `${m.culture} ${destShort}`;
                    }
                    detailText = cultureText 
                      ? <span>→ {farmShort} <span className="text-purple-500">• {cultureText}</span></span>
                      : `→ ${farmShort}`;
                  }
                  
                  return (
                    <tr key={m.id || idx}>
                      <td className="text-gray-600 text-sm whitespace-nowrap">{m.date}</td>
                      <td><Badge color={typeInfo.color}>{typeInfo.icon} {typeInfo.label}</Badge></td>
                      <td className="font-medium text-gray-900">{m.product}</td>
                      <td className="text-right font-semibold">{fmt(m.quantity)}</td>
                      <td className="text-right text-gray-600">{fmtMoney(m.price)}</td>
                      <td className="text-right font-semibold text-green-600">{fmtMoney(value)}</td>
                      <td className="text-gray-500 text-sm">
                        {detailText}
                        {m.notes && <span className="text-xs text-purple-500 ml-1">🧪</span>}
                      </td>
                      <td>
                        {!readOnly && <>
                          <button onClick={() => handleEdit(m)} className="p-1.5 rounded hover:bg-blue-50 text-blue-500 mr-1">✏️</button>
                          <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500">🗑</button>
                        </>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                <div className="text-sm text-gray-600">
                  Affichage {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredMovements.length)} sur {filteredMovements.length} mouvements
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ««
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ‹ Précédent
                  </button>
                  <div className="flex items-center gap-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 text-sm rounded-lg ${
                            currentPage === pageNum 
                              ? 'bg-green-500 text-white font-bold' 
                              : 'bg-white border hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Suivant ›
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    »»
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Main Modal */}
      <Modal isOpen={showModal} onClose={() => {
        setShowModal(false);
        setShowNewSupplier(false);
        setNewSupplierName('');
      }} title={
        modalType === 'entry' ? '📥 Nouvelle Entrée' : 
        modalType === 'exit' ? '📤 Nouvelle Sortie' : 
        modalType === 'transfer' ? '↔️ Nouveau Transfert' :
        '🔥 Nouvelle Consommation'
      } size="md">
        <div className="space-y-4">
          

          {/* Transfer Form */}
          {modalType === 'transfer' && (
            <>
              <Input label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
              
              <Select label="Produit *" value={form.product} onChange={(v) => setForm({ ...form, product: v })}
                options={[{ value: '', label: 'Sélectionner...' }, ...products.map(p => ({ value: p.name, label: p.name }))]} />
              
              <Input label="Quantité *" type="number" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} placeholder="0" />
              
              <div className="grid grid-cols-2 gap-4">
                <Select label="Ferme Source *" value={form.fromFarm} onChange={(v) => {
                  // If the new source is the same as destination, reset destination
                  const newToFarm = v === form.toFarm ? FARMS.find(f => f.id !== v)?.id || '' : form.toFarm;
                  setForm({ ...form, fromFarm: v, toFarm: newToFarm });
                }}
                  options={FARMS.filter(f => f.id !== form.toFarm).map(f => ({ value: f.id, label: f.name }))} />
                <Select label="Ferme Destination *" value={form.toFarm} onChange={(v) => setForm({ ...form, toFarm: v })}
                  options={FARMS.filter(f => f.id !== form.fromFarm).map(f => ({ value: f.id, label: f.name }))} />
              </div>

              {/* Stock disponible dans la ferme source */}
              {form.product && form.fromFarm && (
                <div className={`p-4 rounded-xl border-2 flex items-center justify-between ${
                  (productStockInSource || 0) > 0 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📦</span>
                    <span className="text-gray-700">
                      Stock {FARMS.find(f => f.id === form.fromFarm)?.short || form.fromFarm}:
                    </span>
                  </div>
                  <span className={`text-xl font-bold ${(productStockInSource || 0) > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                    {fmt(productStockInSource || 0)} {getProductUnit(form.product)}
                  </span>
                </div>
              )}

              {/* Alerte stock insuffisant */}
              {form.product && form.quantity && productStockInSource !== null && parseFloat(form.quantity) > productStockInSource && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
                  <p className="text-sm text-orange-600">⚠️ Stock insuffisant ! Disponible: {fmt(productStockInSource)} {getProductUnit(form.product)}</p>
                </div>
              )}
              
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Annuler</Button>
                <Button onClick={handleTransferSubmit} className="flex-1 bg-purple-600 hover:bg-purple-700">
                  Enregistrer
                </Button>
              </div>
            </>
          )}

          {/* Simple Form (Entry, Exit, Consumption Simple) */}
          {modalType !== 'transfer' && (modalType !== 'consumption' || consoMode === 'simple') && (
            <>
              <Select label="Produit *" value={form.product} onChange={(v) => setForm({ ...form, product: v })}
                options={[{ value: '', label: 'Sélectionner...' }, ...products.map(p => ({ value: p.name, label: p.name }))]} />
              
              {modalType === 'entry' ? (
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Quantité *" type="number" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} placeholder="0" />
                  <Input label="Prix unitaire" type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} placeholder="Auto" />
                </div>
              ) : (
                <Input label="Quantité *" type="number" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} placeholder="0" />
              )}
              
              <Input label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
              
              {modalType === 'entry' && (
                <>
                  {!showNewSupplier ? (
                    <Select label="Fournisseur *" value={form.supplier} onChange={(v) => {
                      if (v === '__NEW__') {
                        setShowNewSupplier(true);
                        setForm({ ...form, supplier: '' });
                      } else {
                        setForm({ ...form, supplier: v });
                      }
                    }}
                      options={[
                        { value: '', label: 'Sélectionner un fournisseur...' },
                        ...[...new Set(suppliers)].sort().map(s => ({ value: s, label: s })),
                        { value: '__NEW__', label: '➕ Ajouter un nouveau fournisseur...' }
                      ]} />
                  ) : (
                    <div className="space-y-2">
                      <Input label="Nouveau fournisseur *" value={newSupplierName} onChange={setNewSupplierName} 
                        placeholder="Nom du nouveau fournisseur" />
                      <button 
                        type="button"
                        onClick={() => {
                          setShowNewSupplier(false);
                          setNewSupplierName('');
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        ← Choisir un fournisseur existant
                      </button>
                    </div>
                  )}
                </>
              )}
              
              {modalType !== 'entry' && (
                <Select label="Ferme destination" value={form.farm} onChange={(v) => {
                    const newForm = { ...form, farm: v };
                    const farmCultures = FARM_CULTURES[v] || ['Myrtille'];
                    if (!farmCultures.includes(form.culture)) {
                      newForm.culture = farmCultures[0];
                    }
                    // AGB3 Myrtille: pas de Sol → basculer vers Hydro
                    if (v === 'AGRO BERRY 3' && (newForm.culture === 'Myrtille') && newForm.destination === 'Sol') {
                      newForm.destination = 'Hydro';
                    }
                    setForm(newForm);
                  }}
                  options={FARMS.map(f => ({ value: f.id, label: f.name }))} />
              )}
              
              {/* Stock display for exit (warehouse stock) */}
              {modalType === 'exit' && form.product && (
                <div className={`p-4 rounded-xl border-2 flex items-center justify-between ${
                  (productStockInWarehouse || 0) > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏭</span>
                    <span className="text-gray-700">Stock Magasin:</span>
                  </div>
                  <span className={`text-xl font-bold ${(productStockInWarehouse || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmt(productStockInWarehouse || 0)} {getProductUnit(form.product)}
                  </span>
                </div>
              )}

              {/* Stock warning for exit */}
              {modalType === 'exit' && form.product && form.quantity && productStockInWarehouse !== null && parseFloat(form.quantity) > productStockInWarehouse && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600 font-medium">⛔ Stock magasin insuffisant ! Disponible: {fmt(productStockInWarehouse)} {getProductUnit(form.product)}</p>
                </div>
              )}
              
              {modalType === 'consumption' && (
                <Select label="Culture" value={form.culture} onChange={(v) => {
                    const newForm = { ...form, culture: v };
                    if (v === 'Fraise' && form.destination === 'Hydro') {
                      newForm.destination = 'Sol';
                    }
                    setForm(newForm);
                  }}
                  options={CULTURES.filter(c => (FARM_CULTURES[form.farm] || ['Myrtille']).includes(c.id)).map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))} />
              )}
              
              {/* Stock display for consumption */}
              {modalType === 'consumption' && form.product && form.farm && (
                <div className={`p-4 rounded-xl border-2 flex items-center justify-between ${
                  (productStockForConso || 0) > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📦</span>
                    <span className="text-gray-700">
                      Stock {FARMS.find(f => f.id === form.farm)?.short || form.farm}:
                    </span>
                  </div>
                  <span className={`text-xl font-bold ${(productStockForConso || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmt(productStockForConso || 0)} {getProductUnit(form.product)}
                  </span>
                </div>
              )}

              {/* Stock warning for consumption */}
              {modalType === 'consumption' && form.product && form.quantity && productStockForConso !== null && parseFloat(form.quantity) > productStockForConso && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600 font-medium">⛔ Stock insuffisant ! Disponible: {fmt(productStockForConso)} {getProductUnit(form.product)}</p>
                </div>
              )}
              
              {modalType === 'consumption' && (() => {
                const destOptions = [
                  { value: 'Sol', label: '🌍 Sol' },
                  { value: 'Hydro', label: '💧 Hydroponic' },
                  { value: 'Foliaire', label: '🍃 Foliaire' },
                  { value: 'Pesticide', label: '🧪 Pesticide' }
                ].filter(d => {
                  if (d.value === 'Hydro' && form.culture === 'Fraise') return false;
                  if (d.value === 'Sol' && form.farm === 'AGRO BERRY 3' && form.culture === 'Myrtille') return false;
                  return true;
                });
                return (
                  <Select label="Destination" value={form.destination} onChange={(v) => setForm({ ...form, destination: v })}
                    options={destOptions} />
                );
              })()}
              
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={() => {
                  setShowModal(false);
                  setShowNewSupplier(false);
                  setNewSupplierName('');
                }} className="flex-1">Annuler</Button>
                <Button onClick={handleSubmit} className="flex-1">Enregistrer</Button>
              </div>
            </>
          )}

        </div>
      </Modal>

    </div>
  );
};

export default Movements;