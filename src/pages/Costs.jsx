import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Button, Input, EmptyState } from '../components/UI';
import { FARMS, COST_CATEGORIES, CULTURES, SUPERFICIES_DETAIL, FARM_CULTURES } from '../lib/constants';
import { fmt, fmtMoney, downloadExcel } from '../lib/utils';

const Costs = () => {
  const { products, movements } = useApp();
  const [selectedFarm, setSelectedFarm] = useState('AGRO BERRY 1');
  const [selectedCulture, setSelectedCulture] = useState('Myrtille');
  const [selectedCategory, setSelectedCategory] = useState('Engrais Poudre Sol');
  const [search, setSearch] = useState('');

  const availableCultures = useMemo(() => {
    if (selectedFarm === 'ALL') return CULTURES;
    return CULTURES.filter(c => FARM_CULTURES[selectedFarm]?.includes(c.id));
  }, [selectedFarm]);

  const availableCategories = useMemo(() => {
    let categories = [...COST_CATEGORIES];
    if (selectedFarm === 'AGRO BERRY 3') {
      categories = categories.filter(c => c.id !== 'Engrais Poudre Sol');
    }
    if (selectedCulture === 'Fraise') {
      categories = categories.filter(c => c.id !== 'Engrais Poudre Hydroponic');
    }
    return categories;
  }, [selectedFarm, selectedCulture]);

  const getSuperficie = (farm, culture, category) => {
    if (farm === 'ALL') {
      let total = 0;
      FARMS.forEach(f => {
        const farmData = SUPERFICIES_DETAIL[f.id];
        if (farmData && farmData[culture]) {
          if (category === 'Engrais Poudre Sol') total += farmData[culture]['Sol'] || 0;
          else if (category === 'Engrais Poudre Hydroponic') total += farmData[culture]['Hydro'] || 0;
          else total += farmData[culture]['Foliaire'] || farmData[culture]['Pesticides'] || farmData[culture]['Sol'] || 0;
        }
      });
      return total;
    }
    const farmData = SUPERFICIES_DETAIL[farm];
    if (!farmData || !farmData[culture]) return 0;
    if (category === 'Engrais Poudre Sol') return farmData[culture]['Sol'] || 0;
    if (category === 'Engrais Poudre Hydroponic') return farmData[culture]['Hydro'] || 0;
    return farmData[culture]['Foliaire'] || farmData[culture]['Pesticides'] || farmData[culture]['Sol'] || 0;
  };

  const superficie = getSuperficie(selectedFarm, selectedCulture, selectedCategory);
  const farmShort = selectedFarm === 'ALL' ? 'Toutes' : FARMS.find(f => f.id === selectedFarm)?.short || '';

  const seasonMonths = [
    { idx: 0, name: 'Sept', month: 8 },
    { idx: 1, name: 'Oct', month: 9 },
    { idx: 2, name: 'Nov', month: 10 },
    { idx: 3, name: 'Déc', month: 11 },
    { idx: 4, name: 'Jan', month: 0 }
  ];

  // Determine cost category from product and movement
  const getCostCategory = (productName, destination) => {
    const product = products.find(p => p.name === productName);
    const cat = product?.category || '';
    
    if (cat === 'BOURDONS') return 'Bourdons';
    if (cat === 'PHYTOSANITAIRES') return 'Pesticides';
    
    // For ENGRAIS and ACIDES, check destination
    if (destination === 'Sol') return 'Engrais Poudre Sol';
    if (destination === 'Hydroponic' || destination === 'Hydro') return 'Engrais Poudre Hydroponic';
    if (destination === 'Pesticide') return 'Pesticides';
    
    // Check if it's a foliaire product
    const foliaires = ['EFFICIENT', 'GREENSTIM', 'GREEN STEM', 'KELPAK', 'KELP BIO', 
      'CITOCALCUIM', 'PROSILICON', 'BIOMEX', 'RAIZANTE', 'BIOFORGE',
      'FOLIASTIM', 'ISABION', 'FOLICIST', 'VITACROP', 'NOVA'];
    if (foliaires.some(f => productName.toUpperCase().includes(f))) return 'Engrais Foliaire';
    
    return 'Engrais Poudre Sol'; // default
  };

  // Liste des pesticides connus (override localStorage)
  const KNOWN_PESTICIDES = ['OIKOS', 'SWITCH', 'TIOSOL', 'ACRAMITE', 'ACTARA', 'AFRAW', 'ALFABET', 
    'ALIETTE FLASH', 'BENEVIA', 'CIDELY TOP', 'DICARZOL', 'EXIREL', 'JOKER', 'KAISER', 'KOBUS', 
    'KRISANT', 'LIMOCIDE', 'LUNA SENSATION', 'MAVRIK', 'MILBEKNOCK', 'MOLATHION', 'MOVENTO', 
    'ORTIVA', 'PIRIMOR', 'PIXEL', 'PROBLAD', 'PROCLAIM', 'RADIANT', 'SAPHYR', 'SCELTA', 
    'SIGNUM', 'SIVANTO PRIME', 'STROBY', 'TALENDO', 'TELDOR', 'TIMOREX GOLD', 'VERIMARK'];

  // Smart category: TOUJOURS vérifier la catégorie produit en priorité
  const getSmartCategory = (m) => {
    const productName = (m.product || '').toUpperCase();
    if (KNOWN_PESTICIDES.some(p => productName.includes(p))) return 'Pesticides';
    const product = products.find(p => p.name === m.product || p.name?.toUpperCase() === productName);
    const prodCat = product?.category || '';
    if (prodCat === 'PHYTOSANITAIRES') return 'Pesticides';
    if (prodCat === 'BOURDONS') return 'Bourdons';
    return m.category || getCostCategory(m.product, m.destination);
  };

  // Get month index from date
  const getMonthFromDate = (dateStr) => {
    if (!dateStr) return -1;
    const d = new Date(dateStr);
    return d.getMonth();
  };

  // Build product data from consumption movements
  const productData = useMemo(() => {
    // Filter consumption movements
    const consoMovements = movements.filter(m => {
      if (m.type !== 'consumption') return false;
      if (selectedFarm !== 'ALL' && m.farm !== selectedFarm) return false;
      if (m.culture !== selectedCulture) return false;
      
      // Use smart category: product category takes priority
      const costCat = getSmartCategory(m);
      if (costCat !== selectedCategory) return false;
      
      return true;
    });

    // Group by product
    const productMap = {};
    consoMovements.forEach(m => {
      const pName = m.product;
      if (!productMap[pName]) {
        const product = products.find(p => p.name === pName);
        productMap[pName] = {
          nom: pName,
          nature: product?.category || 'ENGRAIS',
          prix: m.price || product?.price || 0,
          qte: [0, 0, 0, 0, 0] // Sept, Oct, Nov, Déc, Jan
        };
      }
      
      // Add quantity to correct month
      const month = getMonthFromDate(m.date);
      const seasonIdx = seasonMonths.findIndex(sm => sm.month === month);
      if (seasonIdx >= 0) {
        productMap[pName].qte[seasonIdx] += m.quantity || 0;
      }
      
      // Update price if available
      if (m.price && m.price > 0) {
        productMap[pName].prix = m.price;
      }
    });

    // Convert to array and filter
    return Object.values(productMap)
      .filter(p => p.qte.some(q => q > 0))
      .filter(p => !search || p.nom.toLowerCase().includes(search.toLowerCase()))
      .map(p => {
        const totalQty = p.qte.reduce((a, b) => a + b, 0);
        const totalCost = totalQty * p.prix;
        return { ...p, totalQty, totalCost };
      })
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [movements, products, selectedFarm, selectedCulture, selectedCategory, search]);

  // Calculate totals
  const totals = useMemo(() => {
    let totalQty = 0, totalCost = 0;
    productData.forEach(p => {
      totalQty += p.totalQty;
      totalCost += p.totalCost;
    });
    return { totalQty, totalCost };
  }, [productData]);

  // Category totals across all categories
  const categoryTotals = useMemo(() => {
    const catTotals = {};
    COST_CATEGORIES.forEach(cat => {
      catTotals[cat.id] = { qty: 0, cost: 0 };
    });

    movements.filter(m => {
      if (m.type !== 'consumption') return false;
      if (selectedFarm !== 'ALL' && m.farm !== selectedFarm) return false;
      if (m.culture !== selectedCulture) return false;
      return true;
    }).forEach(m => {
      const costCat = getSmartCategory(m);
      const product = products.find(p => p.name === m.product);
      const price = m.price || product?.price || 0;
      if (catTotals[costCat]) {
        catTotals[costCat].qty += m.quantity || 0;
        catTotals[costCat].cost += (m.quantity || 0) * price;
      }
    });

    return catTotals;
  }, [movements, products, selectedFarm, selectedCulture]);

  const globalTotal = useMemo(() => {
    return Object.values(categoryTotals).reduce((sum, cat) => sum + cat.cost, 0);
  }, [categoryTotals]);

  const handleExport = async () => {
    const data = productData.map(p => ({
      Produit: p.nom,
      Nature: p.nature,
      'P.U (MAD)': p.prix,
      ...Object.fromEntries(seasonMonths.map(m => [`${m.name} Qté`, p.qte[m.idx] || 0])),
      ...Object.fromEntries(seasonMonths.map(m => [`${m.name} Coût`, (p.qte[m.idx] || 0) * p.prix])),
      'Total Qté': p.totalQty,
      'Total Coût': p.totalCost
    }));
    await downloadExcel(data, `cout-production-${farmShort}-${selectedCulture}-${selectedCategory}.xlsx`);
  };

  const handleReset = () => {
    setSelectedFarm('AGRO BERRY 1');
    setSelectedCulture('Myrtille');
    setSelectedCategory('Engrais Poudre Sol');
    setSearch('');
  };

  const getCategoryIcon = (catId) => {
    const icons = {
      'Bourdons': '🐝',
      'Engrais Poudre Sol': '🌍',
      'Engrais Poudre Hydroponic': '💧',
      'Engrais Foliaire': '🌿',
      'Pesticides': '🧪'
    };
    return icons[catId] || '📦';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">💰</div>
            <div>
              <h1 className="text-2xl font-bold">Coût de Production</h1>
              <p className="text-green-100 mt-1">
                {farmShort} • {selectedCulture} • {superficie.toFixed(2)} ha • 2025/2026
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={handleReset} className="!bg-white/20 !text-white border-0">
            🔄 Reset
          </Button>
        </div>

        {/* Farm & Culture selector */}
        <div className="flex flex-wrap gap-2 mt-5">
          {FARMS.map(f => (
            <button
              key={f.id}
              onClick={() => {
                setSelectedFarm(f.id);
                if (!FARM_CULTURES[f.id]?.includes(selectedCulture)) {
                  setSelectedCulture(FARM_CULTURES[f.id]?.[0] || 'Myrtille');
                }
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedFarm === f.id ? 'bg-white text-green-600' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {f.short}
            </button>
          ))}
          <div className="w-px bg-white/30 mx-2" />
          {availableCultures.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCulture(c.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                selectedCulture === c.id ? 'bg-white text-green-600' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-gray-500 text-xs">💰 Total Global</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{fmtMoney(globalTotal)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-gray-500 text-xs">🌿 Coût Global/ha</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{fmtMoney(superficie > 0 ? globalTotal / superficie : 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-gray-500 text-xs">{getCategoryIcon(selectedCategory)} {selectedCategory}</p>
          <p className="text-2xl font-bold text-orange-500 mt-1">{fmtMoney(totals.totalCost)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-gray-500 text-xs">📊 Coût/ha</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{fmtMoney(superficie > 0 ? totals.totalCost / superficie : 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-gray-500 text-xs">📦 Produits</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{productData.length}</p>
        </Card>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {availableCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              selectedCategory === cat.id 
                ? 'bg-green-500 text-white shadow-lg' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border'
            }`}
          >
            {getCategoryIcon(cat.id)} {cat.name}
            {categoryTotals[cat.id]?.cost > 0 && (
              <span className={`text-xs ${selectedCategory === cat.id ? 'text-green-100' : 'text-gray-400'}`}>
                ({fmtMoney(categoryTotals[cat.id].cost)})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search & Export */}
      <div className="flex gap-3">
        <Input 
          placeholder="🔍 Rechercher un produit..." 
          value={search} 
          onChange={setSearch} 
          className="flex-1"
        />
        <Button variant="secondary" onClick={handleExport}>📥 Export</Button>
      </div>

      {/* Products table */}
      <Card className="overflow-hidden p-0">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getCategoryIcon(selectedCategory)}</span>
            <div>
              <h3 className="font-bold text-lg uppercase">{selectedCategory}</h3>
              <p className="text-orange-100 text-sm">{productData.length} produits</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-orange-100 text-xs">Quantité</p>
            <p className="font-bold text-lg">{fmt(totals.totalQty)}</p>
          </div>
          <div className="text-right">
            <p className="text-orange-100 text-xs">Coût</p>
            <p className="font-bold text-lg">{fmtMoney(totals.totalCost)}</p>
          </div>
        </div>

        {productData.length === 0 ? (
          <div className="p-8">
            <EmptyState icon="📭" message="Aucune consommation enregistrée pour cette catégorie" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left p-3 font-semibold text-gray-700" rowSpan={2}>Produit</th>
                  <th className="text-center p-2 font-medium text-gray-500 text-xs" rowSpan={2}>P.U<br/>(MAD)</th>
                  {seasonMonths.map(m => (
                    <th key={m.idx} colSpan={2} className="text-center p-2 font-semibold text-gray-700 border-l">
                      {m.name}
                    </th>
                  ))}
                  <th colSpan={2} className="text-center p-2 font-bold text-orange-600 border-l bg-orange-50">TOTAL</th>
                </tr>
                <tr className="bg-gray-50 border-b text-xs">
                  {seasonMonths.map(m => (
                    <React.Fragment key={m.idx}>
                      <th className="p-2 text-center text-gray-500 border-l">Qté</th>
                      <th className="p-2 text-center text-orange-500">Coût</th>
                    </React.Fragment>
                  ))}
                  <th className="p-2 text-center text-gray-600 border-l bg-orange-50">Qté</th>
                  <th className="p-2 text-center text-orange-600 bg-orange-50">Coût</th>
                </tr>
              </thead>
              <tbody>
                {productData.map((p, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-800">{p.nom}</td>
                    <td className="p-2 text-center text-gray-600">{fmt(p.prix)}</td>
                    {seasonMonths.map(m => (
                      <React.Fragment key={m.idx}>
                        <td className="p-2 text-center border-l">
                          {p.qte[m.idx] > 0 ? fmt(p.qte[m.idx]) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="p-2 text-center text-orange-500">
                          {p.qte[m.idx] > 0 ? fmtMoney(p.qte[m.idx] * p.prix) : <span className="text-gray-300">-</span>}
                        </td>
                      </React.Fragment>
                    ))}
                    <td className="p-2 text-center font-bold text-gray-700 border-l bg-orange-50">{fmt(p.totalQty)}</td>
                    <td className="p-2 text-center font-bold text-orange-600 bg-orange-50">{fmtMoney(p.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Costs;
