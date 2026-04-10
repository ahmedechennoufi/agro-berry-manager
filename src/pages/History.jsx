import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../App';
import { Card, Button, Select, Input, Badge, EmptyState } from '../components/UI';
import { FARMS } from '../lib/constants';
import { fmt, fmtMoney, downloadExcel } from '../lib/utils';
import { calculateFarmStock, getPhysicalInventories, getAveragePrice } from '../lib/store';
import stockHistoryData from '../lib/stockHistory.json';

const STORAGE_KEY = 'agro_stock_history_v1';

const History = () => {
  const { movements, products } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedFarm, setSelectedFarm] = useState('ALL');
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [pendingMonth, setPendingMonth] = useState(null);

  // Load history from localStorage + initial data
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let savedHistory = saved ? JSON.parse(saved) : [];
    
    // Month name to date mapping
    const monthDates = {
      'SEPTEMBRE': { date: '2025-09-25', month: 'Septembre 2025' },
      'OCTOBRE': { date: '2025-10-25', month: 'Octobre 2025' },
      'NOVEMBRE': { date: '2025-11-25', month: 'Novembre 2025' },
      'DECEMBRE': { date: '2025-12-25', month: 'Décembre 2025' },
      'DECEMBRE_2025': { date: '2025-12-25', month: 'Décembre 2025' },
      'JANVIER': { date: '2026-01-25', month: 'Janvier 2026' },
      'FEVRIER': { date: '2026-02-25', month: 'Février 2026' },
      'MARS': { date: '2026-03-25', month: 'Mars 2026' },
      'AVRIL': { date: '2026-04-25', month: 'Avril 2026' }
    };
    
    // Convert stockHistoryData object to array
    const stockHistoryArray = Object.entries(stockHistoryData)
      .filter(([key]) => key !== 'DECEMBRE_2025') // Skip duplicate
      .map(([key, value]) => ({
        ...value,
        month: value.name || monthDates[key]?.month || key,
        date: value.date || monthDates[key]?.date || '2025-01-25'
      }));
    
    // Merge with initial data (don't duplicate)
    const existingDates = savedHistory.map(h => h.date);
    stockHistoryArray.forEach(h => {
      if (!existingDates.includes(h.date)) {
        savedHistory.push(h);
      }
    });
    
    // Sort by date
    savedHistory.sort((a, b) => a.date.localeCompare(b.date));
    setHistory(savedHistory);
    
    // Save merged
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedHistory));
    
    // Select latest month
    if (savedHistory.length > 0) {
      setSelectedMonth(savedHistory[savedHistory.length - 1].date);
    }
  }, []);

  // Build month data from physical inventories
  const physicalInventoryMonths = useMemo(() => {
    const physInvs = getPhysicalInventories();
    if (!physInvs.length) return {};
    
    // Group physical inventories by month (YYYY-MM)
    const byMonth = {};
    physInvs.forEach(inv => {
      if (!inv.date || !inv.data || !inv.farm) return;
      const ym = inv.date.substring(0, 7); // YYYY-MM
      if (!byMonth[ym]) byMonth[ym] = {};
      
      // Map farm to AB key
      const farmKey = inv.farm === 'AGRO BERRY 1' ? 'AB1' 
        : inv.farm === 'AGRO BERRY 2' ? 'AB2' 
        : inv.farm === 'AGRO BERRY 3' ? 'AB3' : null;
      if (!farmKey) return;
      
      // Keep the latest inventory per farm per month
      if (!byMonth[ym][farmKey] || inv.date >= (byMonth[ym][farmKey].date || '')) {
        byMonth[ym][farmKey] = inv;
      }
    });
    
    // Build month data for months that have at least one farm inventory
    const result = {};
    Object.entries(byMonth).forEach(([ym, farms]) => {
      const monthData = { AB1: [], AB2: [], AB3: [], isPhysical: true, physicalFarms: [] };
      
      ['AB1', 'AB2', 'AB3'].forEach(farmKey => {
        const inv = farms[farmKey];
        if (inv && inv.data) {
          monthData.physicalFarms.push(farmKey);
          Object.entries(inv.data).forEach(([product, qty]) => {
            const quantity = parseFloat(qty) || 0;
            if (quantity > 0) {
              const price = getAveragePrice(product) || 0;
              monthData[farmKey].push({ product, quantity, price });
            }
          });
        }
      });
      
      result[ym] = monthData;
    });
    
    return result;
  }, [movements]); // recalc when movements change (which triggers re-render)

  // Calculate current stock (using calculateFarmStock which already uses physical inventory as base)
  const currentStock = useMemo(() => {
    const ab1 = calculateFarmStock('AGRO BERRY 1');
    const ab2 = calculateFarmStock('AGRO BERRY 2');
    const ab3 = calculateFarmStock('AGRO BERRY 3');
    
    const formatStock = (stock) => {
      return Object.entries(stock)
        .map(([product, data]) => ({
          product,
          quantity: data.quantity,
          price: data.price || 0
        }));
    };

    // Use the 25th of the CURRENT month dynamically (not hardcoded January)
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const currentDate = `${y}-${m}-25`;
    const currentMonthName = now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    
    return {
      date: currentDate,
      month: currentMonthName,
      AB1: formatStock(ab1),
      AB2: formatStock(ab2),
      AB3: formatStock(ab3),
      isCalculated: true
    };
  }, [movements]);

  // All months including current live stock, with physical inventory overlay for past months
  const allMonths = useMemo(() => {
    const now = new Date();
    const currentMonthDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-25`;

    // Exclude any saved snapshot for the current month — always use live calculated
    const months = history.filter(m => m.date !== currentMonthDate);

    // Always add the current month as live calculated data
    months.push(currentStock);
    
    // Overlay physical inventory data on PAST months only (not the current live month)
    months.forEach((m, idx) => {
      if (!m.date || m.date === currentMonthDate) return; // Skip current month
      const ym = m.date.substring(0, 7); // YYYY-MM
      const physData = physicalInventoryMonths[ym];
      if (physData && physData.physicalFarms.length > 0) {
        // Replace farm data with physical inventory where available
        const updated = { 
          ...m, 
          isPhysical: true, 
          physicalFarms: [...physData.physicalFarms],
          AB1: physData.AB1.length > 0 ? physData.AB1 : (m.AB1 || []),
          AB2: physData.AB2.length > 0 ? physData.AB2 : (m.AB2 || []),
          AB3: physData.AB3.length > 0 ? physData.AB3 : (m.AB3 || [])
        };
        months[idx] = updated;
      }
    });
    
    return months.sort((a, b) => a.date.localeCompare(b.date));
  }, [history, currentStock, physicalInventoryMonths]);

  // Get selected month data
  const selectedData = useMemo(() => {
    return allMonths.find(m => m.date === selectedMonth) || null;
  }, [allMonths, selectedMonth]);

  // Get unit for product
  const getProductUnit = (productName) => {
    const product = products.find(p => p.name?.toUpperCase() === productName?.toUpperCase());
    return product?.unit || 'KG';
  };

  // Get products for display
  const displayProducts = useMemo(() => {
    if (!selectedData) return [];
    
    const productMap = {};
    
    ['AB1', 'AB2', 'AB3'].forEach(farm => {
      (selectedData[farm] || []).forEach(item => {
        const key = item.product.toUpperCase();
        if (!productMap[key]) {
          productMap[key] = { 
            product: key, 
            AB1: 0, 
            AB2: 0, 
            AB3: 0, 
            price: item.price || 0,
            unit: getProductUnit(item.product)
          };
        }
        productMap[key][farm] = item.quantity;
        if (item.price > 0) productMap[key].price = item.price;
      });
    });
    
    let productsList = Object.values(productMap);
    
    // Filter by farm
    if (selectedFarm !== 'ALL') {
      const farmKey = selectedFarm.replace('AGRO BERRY ', 'AB');
      productsList = productsList.filter(p => p[farmKey] > 0);
    }
    
    // Filter by search
    if (search) {
      productsList = productsList.filter(p => 
        p.product.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Calculate totals
    productsList.forEach(p => {
      p.total = p.AB1 + p.AB2 + p.AB3;
      p.value = p.total * p.price;
    });
    
    return productsList.sort((a, b) => b.value - a.value);
  }, [selectedData, selectedFarm, search, products]);

  // Stats
  const stats = useMemo(() => {
    const totalQty = displayProducts.reduce((s, p) => s + p.total, 0);
    const totalValue = displayProducts.reduce((s, p) => s + p.value, 0);
    
    return {
      nbProducts: displayProducts.length,
      totalValue,
      totalQty,
      date: selectedData?.date || ''
    };
  }, [displayProducts, selectedData]);

  // Save current month snapshot
  const saveJanuarySnapshot = () => {
    const newHistory = history.filter(h => h.date !== currentStock.date);
    newHistory.push({ ...currentStock, isCalculated: false });
    newHistory.sort((a, b) => a.date.localeCompare(b.date));
    
    setHistory(newHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    setSelectedMonth(currentStock.date);
  };

  // Handle month click - show export option
  const handleMonthClick = (monthData) => {
    setPendingMonth(monthData);
    setShowExportModal(true);
  };

  // Export specific month data
  const exportMonthData = async (monthData) => {
    if (!monthData) return;
    
    const productMap = {};
    ['AB1', 'AB2', 'AB3'].forEach(farm => {
      (monthData[farm] || []).forEach(item => {
        const key = item.product?.toUpperCase();
        if (!productMap[key]) {
          productMap[key] = { product: item.product, AB1: 0, AB2: 0, AB3: 0, price: item.price || 0 };
        }
        productMap[key][farm] = item.quantity || 0;
        if (item.price) productMap[key].price = item.price;
      });
    });
    
    const data = Object.values(productMap).map(p => {
      const total = (p.AB1 || 0) + (p.AB2 || 0) + (p.AB3 || 0);
      const unit = products.find(pr => pr.name?.toUpperCase() === p.product?.toUpperCase())?.unit || 'KG';
      return {
        Produit: p.product,
        Unite: unit,
        'AGB 1': p.AB1,
        'AGB 2': p.AB2,
        'AGB 3': p.AB3,
        'Total': total,
        'Prix Unit.': p.price,
        'Valeur': total * p.price
      };
    });
    
    await downloadExcel(data, `stock-${monthData.month || 'inventaire'}.xlsx`);
  };

  // Confirm export and select month
  const handleExportConfirm = async () => {
    if (pendingMonth) {
      await exportMonthData(pendingMonth);
      setSelectedMonth(pendingMonth.date);
    }
    setShowExportModal(false);
    setPendingMonth(null);
  };

  // Just select month without export
  const handleSelectOnly = () => {
    if (pendingMonth) {
      setSelectedMonth(pendingMonth.date);
    }
    setShowExportModal(false);
    setPendingMonth(null);
  };

  const handleExport = async () => {
    const data = displayProducts.map(p => ({
      Produit: p.product,
      Unite: p.unit,
      'AGB 1': p.AB1,
      'AGB 2': p.AB2,
      'AGB 3': p.AB3,
      'Total': p.total,
      'Prix Unit.': p.price,
      'Valeur': p.value
    }));
    await downloadExcel(data, `historique-${selectedData?.month || 'stock'}.xlsx`);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            📅 Historique Stock
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", margin: "4px 0 0" }}>Stock des mois précédents - Campagne 2025-2026</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button 
            onClick={handleExport} 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg flex items-center gap-2"
          >
            📥 Export Excel
          </button>
          {selectedData?.isCalculated && (
            <button 
              onClick={saveJanuarySnapshot} 
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-lg"
            >
              💾 Sauvegarder
            </button>
          )}
        </div>
      </div>

      {/* Month Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {allMonths.map(m => (
          <button
            key={m.date}
            onClick={() => handleMonthClick(m)}
            className={`p-4 rounded-xl font-medium transition-all text-center ${
              selectedMonth === m.date
                ? 'bg-green-500 text-white shadow-lg'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-green-300 hover:shadow'
            }`}
          >
            <div className="text-lg font-bold uppercase">{m.month}</div>
            <div className="text-sm opacity-70">{formatDate(m.date)}</div>
            {m.isPhysical && <span className="text-xs">📋 Physique</span>}
            {m.isCalculated && !m.isPhysical && <span className="text-xs">⚡ Calculé</span>}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      {selectedData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          <div style={{ background: '#f0f6ff', borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(0,122,255,0.12)' }}>
            <p style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase' }}>📦 Produits</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--blue)', margin: 0 }}>{stats.nbProducts}</p>
          </div>
          <div style={{ background: '#f0faf2', borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(52,199,89,0.12)' }}>
            <p style={{ fontSize: 11, color: '#1a8a36', fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase' }}>💰 Valeur Totale</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#1a8a36', margin: 0 }}>{fmtMoney(stats.totalValue)}</p>
          </div>
          <div style={{ background: '#f8f0ff', borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(175,82,222,0.12)' }}>
            <p style={{ fontSize: 11, color: 'var(--purple)', fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase' }}>📊 Quantité Totale</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--purple)', margin: 0 }}>{fmt(stats.totalQty)}</p>
          </div>
          <div style={{ background: '#fff8f0', borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(255,149,0,0.12)' }}>
            <p style={{ fontSize: 11, color: 'var(--orange)', fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase' }}>📅 Date Inventaire</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--orange)', margin: 0 }}>{formatDate(stats.date)}</p>
            {selectedData?.isPhysical && <p style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, margin: '4px 0 0' }}>📋 Inventaire Physique</p>}
            {selectedData?.isCalculated && !selectedData?.isPhysical && <p style={{ fontSize: 11, color: 'var(--orange)', margin: '4px 0 0' }}>Calculé</p>}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div style={{ flex: 1 }}>
            <Input 
              placeholder="🔍 Rechercher un produit..." 
              value={search} 
              onChange={setSearch}
            />
          </div>
          <Select 
            value={selectedFarm} 
            onChange={setSelectedFarm}
            options={[
              { value: 'ALL', label: 'Toutes les fermes' },
              ...FARMS.map(f => ({ value: f.id, label: f.name }))
            ]}
            className="md:w-52"
          />
        </div>
      </Card>

      {/* Table */}
      <div className="ios-card" style={{ padding: 0 }}>
        {/* Table Header with Export Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 13 }}>{displayProducts.length} produits</span>
            {selectedData?.isPhysical && (
              <span className="badge badge-green">
                📋 Inventaire Physique
                {selectedData.physicalFarms && selectedData.physicalFarms.length < 3 && (
                  <> ({selectedData.physicalFarms.join(', ')})</>
                )}
              </span>
            )}
            {selectedData?.isCalculated && !selectedData?.isPhysical && (
              <span className="badge badge-orange">📊 Calculé depuis mouvements</span>
            )}
          </div>
          <button
            onClick={handleExport}
            className="btn-primary"
            style={{ fontSize: 12, padding: '7px 14px' }}
          >
            📥 Exporter Excel
          </button>
        </div>
        {!selectedData ? (
          <div className="p-6">
            <EmptyState icon="📅" message="Sélectionnez un mois" />
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="p-6">
            <EmptyState icon="📦" message="Aucun produit trouvé" />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: 900, borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '14px 16px', fontWeight: 600, color: 'var(--text-2)', minWidth: 220 }}>PRODUIT</th>
                  <th style={{ textAlign: 'center', padding: '14px 16px', fontWeight: 600, color: 'var(--text-2)', width: 80 }}>UNITÉ</th>
                  <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 600, color: 'var(--text-2)', width: 110 }}>
                    <span style={{ color: 'var(--green)' }}>🌿</span> AGB 1
                  </th>
                  <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 600, color: 'var(--text-2)', width: 110 }}>
                    <span style={{ color: 'var(--blue)' }}>🌱</span> AGB 2
                  </th>
                  <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 600, color: 'var(--text-2)', width: 110 }}>
                    <span style={{ color: 'var(--purple)' }}>🪴</span> AGB 3
                  </th>
                  <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 700, color: 'var(--text-1)', background: 'var(--surface-2)', width: 110 }}>TOTAL</th>
                  <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 600, color: 'var(--text-2)', width: 100 }}>PRIX UNIT.</th>
                  <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 700, color: 'var(--green)', width: 130 }}>VALEUR</th>
                </tr>
              </thead>
              <tbody>
                {displayProducts.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-1)' }}>{p.product}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-2)' }}>{p.unit}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: p.AB1 < 0 ? 'var(--red)' : p.AB1 > 0 ? 'var(--green)' : 'var(--text-3)', fontWeight: p.AB1 > 0 ? 600 : 400 }}>
                      {p.AB1 !== 0 ? fmt(p.AB1) : <span style={{ color: 'var(--text-3)' }}>-</span>}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: p.AB2 < 0 ? 'var(--red)' : p.AB2 > 0 ? 'var(--blue)' : 'var(--text-3)', fontWeight: p.AB2 > 0 ? 600 : 400 }}>
                      {p.AB2 !== 0 ? fmt(p.AB2) : <span style={{ color: 'var(--text-3)' }}>-</span>}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: p.AB3 < 0 ? 'var(--red)' : p.AB3 > 0 ? 'var(--purple)' : 'var(--text-3)', fontWeight: p.AB3 > 0 ? 600 : 400 }}>
                      {p.AB3 !== 0 ? fmt(p.AB3) : <span style={{ color: 'var(--text-3)' }}>-</span>}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, background: 'var(--surface-2)', color: p.total < 0 ? 'var(--red)' : 'var(--text-1)' }}>
                      {fmt(p.total)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-2)' }}>{fmt(p.price)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>
                      {fmtMoney(p.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f0faf2', fontWeight: 700, borderTop: '2px solid rgba(52,199,89,0.2)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text-1)' }}>TOTAL ({displayProducts.length} produits)</td>
                  <td></td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-2)' }}>{fmt(displayProducts.reduce((s, p) => s + p.AB1, 0))}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-2)' }}>{fmt(displayProducts.reduce((s, p) => s + p.AB2, 0))}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-2)' }}>{fmt(displayProducts.reduce((s, p) => s + p.AB3, 0))}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', background: '#dcfce7', color: 'var(--text-1)' }}>{fmt(stats.totalQty)}</td>
                  <td></td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--green)', fontSize: 15 }}>{fmtMoney(stats.totalValue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Export Confirmation Modal */}
      {showExportModal && pendingMonth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              📥 {pendingMonth.month}
            </h3>
            <p className="text-gray-600 mb-6">
              Voulez-vous exporter l'inventaire de ce mois en Excel ?
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleSelectOnly}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
              >
                Non, juste voir
              </button>
              <button
                onClick={handleExportConfirm}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
              >
                ✅ Oui, exporter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
