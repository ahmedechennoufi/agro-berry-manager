import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Button, Modal, EmptyState, Badge, Input, Select, StatCard, ProgressBar } from '../components/UI';
import { getCommandes, getCommandeByMonth, saveCommande, deleteCommande } from '../lib/store';
import * as XLSX from 'xlsx';

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const getMonthLabel = (monthStr) => {
  const [year, month] = monthStr.split('-');
  return `${MONTHS_FR[parseInt(month) - 1]} ${year}`;
};

const getStatusInfo = (item) => {
  const ordered = item.ordered || 0;
  const received = item.received || 0;
  if (received >= ordered) return { label: 'Complet', color: 'green', icon: '✅' };
  if (received > 0) return { label: 'Partiel', color: 'orange', icon: '🟡' };
  return { label: 'En attente', color: 'red', icon: '🔴' };
};

const Commandes = () => {
  const { products, readOnly, showNotif } = useApp();
  const [commandes, setCommandes] = useState(getCommandes());
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receivingItem, setReceivingItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Form for new commande
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [newMonth, setNewMonth] = useState(currentMonth);

  // Form for adding item
  const [itemForm, setItemForm] = useState({ product: '', ordered: '' });

  // Stats for selected commande
  const stats = useMemo(() => {
    if (!selectedCommande) return null;
    const items = selectedCommande.items || [];
    const total = items.length;
    const complete = items.filter(i => (i.received || 0) >= (i.ordered || 0)).length;
    const partial = items.filter(i => (i.received || 0) > 0 && (i.received || 0) < (i.ordered || 0)).length;
    const pending = items.filter(i => (i.received || 0) === 0).length;
    const totalOrdered = items.reduce((s, i) => s + (i.ordered || 0), 0);
    const totalReceived = items.reduce((s, i) => s + (i.received || 0), 0);
    const percentage = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;
    return { total, complete, partial, pending, totalOrdered, totalReceived, percentage };
  }, [selectedCommande]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!selectedCommande) return [];
    let items = selectedCommande.items || [];
    
    if (search) {
      items = items.filter(i => i.product.toLowerCase().includes(search.toLowerCase()));
    }
    
    if (filterStatus !== 'ALL') {
      items = items.filter(i => {
        const status = getStatusInfo(i);
        if (filterStatus === 'complete') return status.label === 'Complet';
        if (filterStatus === 'partial') return status.label === 'Partiel';
        if (filterStatus === 'pending') return status.label === 'En attente';
        return true;
      });
    }
    
    return items;
  }, [selectedCommande, search, filterStatus]);

  // Sorted commandes (newest first)
  const sortedCommandes = useMemo(() => {
    return [...commandes].sort((a, b) => b.month.localeCompare(a.month));
  }, [commandes]);

  // === ACTIONS ===

  const handleCreateCommande = () => {
    const existing = getCommandeByMonth(newMonth);
    if (existing) {
      showNotif('Une commande existe déjà pour ce mois', 'warning');
      return;
    }
    const commande = {
      id: Date.now(),
      month: newMonth,
      items: []
    };
    saveCommande(commande);
    setShowNewModal(false);
    setCommandes(getCommandes());
    setSelectedCommande(commande);
    showNotif('Commande créée');
  };

  const handleDeleteCommande = (id) => {
    if (!confirm('Supprimer cette commande ?')) return;
    deleteCommande(id);
    if (selectedCommande?.id === id) setSelectedCommande(null);
    setCommandes(getCommandes());
    showNotif('Commande supprimée');
  };

  const handleAddItem = () => {
    if (!itemForm.product || !itemForm.ordered) return;
    const items = [...(selectedCommande.items || [])];
    const existingIdx = items.findIndex(i => i.product === itemForm.product);
    
    if (existingIdx >= 0) {
      showNotif('Ce produit est déjà dans la commande', 'warning');
      return;
    }
    
    items.push({
      product: itemForm.product,
      ordered: parseFloat(itemForm.ordered),
      received: 0
    });
    
    const updated = { ...selectedCommande, items };
    saveCommande(updated);
    setItemForm({ product: '', ordered: '' });
    setShowAddItemModal(false);
    setCommandes(getCommandes());
    setSelectedCommande(updated);
    showNotif('Produit ajouté à la commande');
  };

  const handleRemoveItem = (productName) => {
    if (!confirm(`Retirer ${productName} de la commande ?`)) return;
    const items = (selectedCommande.items || []).filter(i => i.product !== productName);
    const updated = { ...selectedCommande, items };
    saveCommande(updated);
    setCommandes(getCommandes());
    setSelectedCommande(updated);
    showNotif('Produit retiré');
  };

  const handleReceive = () => {
    if (!receivingItem) return;
    const items = (selectedCommande.items || []).map(i => 
      i.product === receivingItem.product 
        ? { ...i, received: parseFloat(receivingItem.received) || 0 }
        : { ...i }
    );
    const updated = { ...selectedCommande, items };
    saveCommande(updated);
    setShowReceiveModal(false);
    setReceivingItem(null);
    setCommandes(getCommandes());
    setSelectedCommande(updated);
    showNotif('Réception mise à jour');
  };

  const openReceive = (item) => {
    setReceivingItem({ ...item });
    setShowReceiveModal(true);
  };

  // === EXPORT EXCEL ===

  const exportCommandeExcel = (commande) => {
    const wb = XLSX.utils.book_new();
    
    const items = commande.items || [];
    const data = items.map(item => {
      const status = getStatusInfo(item);
      return {
        'Produit': item.product,
        'Qté Commandée': item.ordered || 0,
        'Qté Reçue': item.received || 0,
        'Qté Restante': Math.max(0, (item.ordered || 0) - (item.received || 0)),
        'Statut': status.label
      };
    });
    
    // Add totals row
    const totalOrdered = items.reduce((s, i) => s + (i.ordered || 0), 0);
    const totalReceived = items.reduce((s, i) => s + (i.received || 0), 0);
    data.push({
      'Produit': 'TOTAL',
      'Qté Commandée': totalOrdered,
      'Qté Reçue': totalReceived,
      'Qté Restante': Math.max(0, totalOrdered - totalReceived),
      'Statut': `${totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0}%`
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Column widths
    ws['!cols'] = [
      { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, getMonthLabel(commande.month));
    XLSX.writeFile(wb, `Commande_${getMonthLabel(commande.month).replace(' ', '_')}.xlsx`);
    showNotif('Excel exporté');
  };

  const exportAllCommandesExcel = () => {
    if (commandes.length === 0) {
      showNotif('Aucune commande à exporter', 'warning');
      return;
    }
    
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = sortedCommandes.map(c => {
      const items = c.items || [];
      const totalOrdered = items.reduce((s, i) => s + (i.ordered || 0), 0);
      const totalReceived = items.reduce((s, i) => s + (i.received || 0), 0);
      const complete = items.filter(i => (i.received || 0) >= (i.ordered || 0)).length;
      const pct = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;
      return {
        'Mois': getMonthLabel(c.month),
        'Nb Produits': items.length,
        'Complets': complete,
        'En cours': items.length - complete,
        'Qté Commandée': totalOrdered,
        'Qté Reçue': totalReceived,
        'Réception (%)': `${pct}%`
      };
    });
    
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    summaryWs['!cols'] = [
      { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Récapitulatif');
    
    // Individual sheets per commande
    sortedCommandes.forEach(c => {
      const items = c.items || [];
      const data = items.map(item => {
        const status = getStatusInfo(item);
        return {
          'Produit': item.product,
          'Qté Commandée': item.ordered || 0,
          'Qté Reçue': item.received || 0,
          'Qté Restante': Math.max(0, (item.ordered || 0) - (item.received || 0)),
          'Statut': status.label
        };
      });
      
      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [
        { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }
      ];
      
      const sheetName = getMonthLabel(c.month).substring(0, 31); // Excel max 31 chars
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
    
    XLSX.writeFile(wb, `Commandes_Récapitulatif.xlsx`);
    showNotif('Récapitulatif exporté');
  };

  // === RENDER ===

  // List view (no commande selected)
  if (!selectedCommande) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📦 Commandes</h1>
            <p className="text-gray-500 text-sm mt-1">Suivi des commandes mensuelles</p>
          </div>
          <div className="flex gap-2">
            {commandes.length > 0 && (
              <Button variant="secondary" onClick={exportAllCommandesExcel}>
                📊 Export Récap Excel
              </Button>
            )}
            {!readOnly && (
              <Button onClick={() => setShowNewModal(true)}>
                + Nouvelle Commande
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {commandes.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard 
              icon="📦" 
              label="Total Commandes" 
              value={commandes.length} 
              color="blue" 
            />
            <StatCard 
              icon="✅" 
              label="Complètes" 
              value={commandes.filter(c => {
                const items = c.items || [];
                return items.length > 0 && items.every(i => (i.received || 0) >= (i.ordered || 0));
              }).length}
              color="green" 
            />
            <StatCard 
              icon="🟡" 
              label="En cours" 
              value={commandes.filter(c => {
                const items = c.items || [];
                const allComplete = items.length > 0 && items.every(i => (i.received || 0) >= (i.ordered || 0));
                const hasReceived = items.some(i => (i.received || 0) > 0);
                return !allComplete && hasReceived;
              }).length}
              color="orange" 
            />
            <StatCard 
              icon="🔴" 
              label="En attente" 
              value={commandes.filter(c => {
                const items = c.items || [];
                return items.length === 0 || items.every(i => (i.received || 0) === 0);
              }).length}
              color="red" 
            />
          </div>
        )}

        {/* Commandes List */}
        {sortedCommandes.length === 0 ? (
          <Card>
            <EmptyState 
              icon="📦" 
              message="Aucune commande pour le moment" 
              action={!readOnly && <Button onClick={() => setShowNewModal(true)}>Créer la première commande</Button>}
            />
          </Card>
        ) : (
          <div className="grid gap-4">
            {sortedCommandes.map(c => {
              const items = c.items || [];
              const totalOrdered = items.reduce((s, i) => s + (i.ordered || 0), 0);
              const totalReceived = items.reduce((s, i) => s + (i.received || 0), 0);
              const pct = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;
              const complete = items.filter(i => (i.received || 0) >= (i.ordered || 0)).length;
              const allDone = items.length > 0 && complete === items.length;
              
              return (
                <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedCommande(c)}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{allDone ? '✅' : pct > 0 ? '🟡' : '📦'}</span>
                        <h3 className="text-lg font-bold text-gray-900">{getMonthLabel(c.month)}</h3>
                        <Badge color={allDone ? 'green' : pct > 0 ? 'orange' : 'blue'}>
                          {allDone ? 'Complète' : pct > 0 ? 'En cours' : 'En attente'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <span>📋 {items.length} produits</span>
                        <span>✅ {complete}/{items.length} reçus</span>
                        <span>📊 {pct}% réception</span>
                      </div>
                      <div className="mt-3 w-full max-w-md">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${allDone ? 'bg-green-500' : pct > 0 ? 'bg-orange-400' : 'bg-gray-300'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); exportCommandeExcel(c); }}
                        className="px-3 py-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 text-sm font-medium transition-colors"
                      >
                        📥 Excel
                      </button>
                      {!readOnly && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteCommande(c.id); }}
                          className="px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium transition-colors"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal Nouvelle Commande */}
        <Modal isOpen={showNewModal} onClose={() => setShowNewModal(false)} title="📦 Nouvelle Commande">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Mois de la commande</label>
              <input 
                type="month" 
                value={newMonth} 
                onChange={(e) => setNewMonth(e.target.value)}
                className="input-field"
              />
            </div>
            <p className="text-sm text-gray-500">
              Une commande sera créée pour <strong>{getMonthLabel(newMonth)}</strong>. 
              Vous pourrez ensuite y ajouter les produits commandés.
            </p>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleCreateCommande} className="flex-1">Créer</Button>
              <Button variant="secondary" onClick={() => setShowNewModal(false)} className="flex-1">Annuler</Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // Detail view (commande selected)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setSelectedCommande(null); setSearch(''); setFilterStatus('ALL'); }}
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
          >
            ←
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📦 {getMonthLabel(selectedCommande.month)}</h1>
            <p className="text-gray-500 text-sm">Suivi de la commande</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => exportCommandeExcel(selectedCommande)}>
            📥 Export Excel
          </Button>
          {!readOnly && (
            <Button onClick={() => { setItemForm({ product: '', ordered: '' }); setShowAddItemModal(true); }}>
              + Ajouter Produit
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon="📋" label="Total Produits" value={stats.total} color="blue" />
          <StatCard icon="✅" label="Complets" value={stats.complete} color="green" />
          <StatCard icon="🟡" label="Partiels" value={stats.partial} color="orange" />
          <StatCard icon="🔴" label="En attente" value={stats.pending} color="red" />
          <StatCard icon="📊" label="Réception" value={`${stats.percentage}%`} color={stats.percentage === 100 ? 'green' : stats.percentage > 0 ? 'orange' : 'red'} />
        </div>
      )}

      {/* Progress Bar */}
      {stats && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progression globale</span>
            <span className="text-sm font-bold text-gray-900">{stats.percentage}%</span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                stats.percentage === 100 ? 'bg-green-500' : stats.percentage > 50 ? 'bg-blue-500' : stats.percentage > 0 ? 'bg-orange-400' : 'bg-gray-300'
              }`}
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Commandé: {Number(stats.totalOrdered).toFixed(1)} KG</span>
            <span>Reçu: {Number(stats.totalReceived).toFixed(1)} KG</span>
            <span>Restant: {Math.max(0, Number(stats.totalOrdered) - Number(stats.totalReceived)).toFixed(1)} KG</span>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
            placeholder="🔍 Rechercher un produit..."
            className="input-field uppercase"
          />
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {[
            { id: 'ALL', label: 'Tous' },
            { id: 'complete', label: '✅ Complet' },
            { id: 'partial', label: '🟡 Partiel' },
            { id: 'pending', label: '🔴 Attente' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                filterStatus === f.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items Table */}
      <Card>
        {filteredItems.length === 0 ? (
          <EmptyState 
            icon="📋" 
            message={search || filterStatus !== 'ALL' ? 'Aucun produit trouvé' : 'Aucun produit dans cette commande'}
            action={!readOnly && !search && filterStatus === 'ALL' && (
              <Button onClick={() => { setItemForm({ product: '', ordered: '' }); setShowAddItemModal(true); }}>
                + Ajouter un produit
              </Button>
            )}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th className="text-right">Commandé</th>
                  <th className="text-right">Reçu</th>
                  <th className="text-right">Restant</th>
                  <th className="text-center">Statut</th>
                  <th className="text-center">Progression</th>
                  {!readOnly && <th className="text-center">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => {
                  const status = getStatusInfo(item);
                  const remaining = Math.max(0, (item.ordered || 0) - (item.received || 0));
                  const pct = item.ordered > 0 ? Math.round(((item.received || 0) / item.ordered) * 100) : 0;
                  
                  return (
                    <tr key={idx}>
                      <td className="font-medium text-gray-900">{item.product}</td>
                      <td className="text-right">{Number(item.ordered || 0).toFixed(1)}</td>
                      <td className="text-right font-semibold">
                        <span className={status.color === 'green' ? 'text-green-600' : status.color === 'orange' ? 'text-orange-600' : 'text-gray-400'}>
                          {Number(item.received || 0).toFixed(1)}
                        </span>
                      </td>
                      <td className="text-right">
                        {remaining > 0 ? (
                          <span className="text-red-500 font-medium">{Number(remaining).toFixed(1)}</span>
                        ) : (
                          <span className="text-green-500">—</span>
                        )}
                      </td>
                      <td className="text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          status.color === 'green' ? 'bg-green-50 text-green-700' :
                          status.color === 'orange' ? 'bg-orange-50 text-orange-700' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {status.icon} {status.label}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                            <div 
                              className={`h-full rounded-full ${
                                pct >= 100 ? 'bg-green-500' : pct > 0 ? 'bg-orange-400' : 'bg-gray-200'
                              }`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-8">{pct}%</span>
                        </div>
                      </td>
                      {!readOnly && (
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button 
                              onClick={() => openReceive(item)}
                              className="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium transition-colors"
                              title="Mettre à jour la réception"
                            >
                              📥 Réception
                            </button>
                            <button 
                              onClick={() => handleRemoveItem(item.product)}
                              className="px-2 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 text-xs transition-colors"
                              title="Retirer"
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Ajouter Produit */}
      <Modal isOpen={showAddItemModal} onClose={() => setShowAddItemModal(false)} title="➕ Ajouter un produit">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Produit</label>
            <select
              value={itemForm.product}
              onChange={(e) => setItemForm(f => ({ ...f, product: e.target.value }))}
              className="select-field"
            >
              <option value="">-- Sélectionner un produit --</option>
              {products
                .filter(p => !(selectedCommande.items || []).some(i => i.product === p.name))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))
              }
            </select>
          </div>
          <Input 
            label="Quantité commandée (KG)"
            type="number"
            value={itemForm.ordered}
            onChange={(v) => setItemForm(f => ({ ...f, ordered: v }))}
            placeholder="Ex: 100"
          />
          <div className="flex gap-3 pt-2">
            <Button onClick={handleAddItem} className="flex-1" disabled={!itemForm.product || !itemForm.ordered}>
              Ajouter
            </Button>
            <Button variant="secondary" onClick={() => setShowAddItemModal(false)} className="flex-1">
              Annuler
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Réception */}
      <Modal isOpen={showReceiveModal} onClose={() => setShowReceiveModal(false)} title="📥 Mise à jour réception">
        {receivingItem && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="font-bold text-gray-900">{receivingItem.product}</p>
              <div className="flex gap-4 mt-2 text-sm text-gray-600">
                <span>Commandé: <strong>{Number(receivingItem.ordered || 0).toFixed(1)}</strong> KG</span>
                <span>Reçu actuel: <strong>{Number(receivingItem.received || 0).toFixed(1)}</strong> KG</span>
              </div>
            </div>
            <Input 
              label="Quantité totale reçue (KG)"
              type="number"
              value={receivingItem.received}
              onChange={(v) => setReceivingItem(prev => ({ ...prev, received: v }))}
              placeholder="Quantité reçue"
            />
            <p className="text-xs text-gray-500">
              💡 Entrez la quantité <strong>totale</strong> reçue à ce jour, pas juste la dernière livraison.
            </p>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleReceive} className="flex-1">
                Confirmer
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => { setShowReceiveModal(false); setReceivingItem(null); }} 
                className="flex-1"
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Commandes;
