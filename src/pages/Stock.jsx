import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Button, Input, Select, StatCard, EmptyState, Badge } from '../components/UI';
import { CATEGORIES } from '../lib/constants';
import { fmt, fmtMoney } from '../lib/utils';
import { calculateGlobalStock, getAveragePrice, getDefaultThreshold } from '../lib/store';

const Stock = () => {
  const { products, movements } = useApp();
  
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStock, setFilterStock] = useState('ALL'); // ALL, epuise, bas, normal
  const [sortBy, setSortBy] = useState('value');
  const [sortOrder, setSortOrder] = useState('desc');

  const threshold = getDefaultThreshold();

  const stockData = useMemo(() => {
    const globalStock = calculateGlobalStock();
    
    return products.map(product => {
      const stock = globalStock[product.name] || { quantity: 0, totalValue: 0 };
      const price = getAveragePrice(product.name) || 0;
      const quantity = stock.quantity || 0;
      const value = quantity * price;
      const productThreshold = product.threshold || threshold;
      
      let status = 'normal';
      if (quantity <= 0) status = 'epuise';
      else if (quantity <= productThreshold) status = 'bas';
      
      return {
        name: product.name,
        category: product.category || 'AUTRES',
        unit: product.unit || 'KG',
        quantity,
        price,
        value,
        status,
        threshold: productThreshold
      };
    });
  }, [products, movements, threshold]);

  const filteredStock = useMemo(() => {
    let result = stockData.filter(item => {
      const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = filterCategory === 'ALL' || item.category === filterCategory;
      const matchStock = filterStock === 'ALL' || item.status === filterStock;
      return matchSearch && matchCategory && matchStock;
    });
    
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortBy === 'quantity') comparison = a.quantity - b.quantity;
      else if (sortBy === 'value') comparison = a.value - b.value;
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return result;
  }, [stockData, search, filterCategory, filterStock, sortBy, sortOrder]);

  // Stats
  const stats = useMemo(() => {
    const totalProducts = filteredStock.length;
    const totalQuantity = filteredStock.reduce((s, i) => s + i.quantity, 0);
    const totalValue = filteredStock.reduce((s, i) => s + i.value, 0);
    const epuiseCount = stockData.filter(i => i.status === 'epuise').length;
    const basCount = stockData.filter(i => i.status === 'bas').length;
    return { totalProducts, totalQuantity, totalValue, epuiseCount, basCount };
  }, [filteredStock, stockData]);

  // Category summary
  const categorySummary = useMemo(() => {
    const summary = {};
    CATEGORIES.forEach(cat => {
      const items = filteredStock.filter(i => i.category === cat.id);
      summary[cat.id] = {
        count: items.length,
        quantity: items.reduce((s, i) => s + i.quantity, 0),
        value: items.reduce((s, i) => s + i.value, 0)
      };
    });
    return summary;
  }, [filteredStock]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handleExport = async () => {
    try {
      const XLSX = (await import('xlsx-js-style')).default || await import('xlsx-js-style');
      const wb = XLSX.utils.book_new();

      const titleStyle = {
        font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E40AF" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
      const headerStyle = {
        font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "3B82F6" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
      };
      const cl = (bg) => ({
        font: { sz: 10 }, fill: { fgColor: { rgb: bg } },
        alignment: { horizontal: "left", vertical: "center" },
        border: { top: { style: "thin", color: { rgb: "D1D5DB" } }, bottom: { style: "thin", color: { rgb: "D1D5DB" } }, left: { style: "thin", color: { rgb: "D1D5DB" } }, right: { style: "thin", color: { rgb: "D1D5DB" } } }
      });
      const cr = (bg) => ({
        font: { sz: 10 }, fill: { fgColor: { rgb: bg } },
        alignment: { horizontal: "right", vertical: "center" }, numFmt: "0.00",
        border: { top: { style: "thin", color: { rgb: "D1D5DB" } }, bottom: { style: "thin", color: { rgb: "D1D5DB" } }, left: { style: "thin", color: { rgb: "D1D5DB" } }, right: { style: "thin", color: { rgb: "D1D5DB" } } }
      });
      const cc = (bg) => ({
        font: { sz: 10 }, fill: { fgColor: { rgb: bg } },
        alignment: { horizontal: "center", vertical: "center" },
        border: { top: { style: "thin", color: { rgb: "D1D5DB" } }, bottom: { style: "thin", color: { rgb: "D1D5DB" } }, left: { style: "thin", color: { rgb: "D1D5DB" } }, right: { style: "thin", color: { rgb: "D1D5DB" } } }
      });
      const statusCell = (status) => ({
        font: { bold: true, sz: 10, color: { rgb: status === 'epuise' ? "991B1B" : status === 'bas' ? "9A3412" : "166534" } },
        fill: { fgColor: { rgb: status === 'epuise' ? "FEE2E2" : status === 'bas' ? "FEF3C7" : "DCFCE7" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: { top: { style: "thin", color: { rgb: "D1D5DB" } }, bottom: { style: "thin", color: { rgb: "D1D5DB" } }, left: { style: "thin", color: { rgb: "D1D5DB" } }, right: { style: "thin", color: { rgb: "D1D5DB" } } }
      });
      const totalStyle = {
        font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E40AF" } },
        alignment: { horizontal: "right", vertical: "center" }, numFmt: "0.00",
        border: { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "thin" }, right: { style: "thin" } }
      };

      const ws = {};
      let r = 0;
      const cols = 7;

      // Title
      for (let c = 0; c < cols; c++) ws[XLSX.utils.encode_cell({ r, c })] = { v: c === 0 ? 'Stock Global Magasin' : '', s: titleStyle };
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: cols - 1 } }];
      r += 2;

      // Headers
      const headers = ['Produit', 'Categorie', 'Quantite', 'Unite', 'Prix Moyen', 'Valeur (MAD)', 'Statut'];
      headers.forEach((h, c) => { ws[XLSX.utils.encode_cell({ r, c })] = { v: h, s: headerStyle }; });
      r++;

      // Data
      filteredStock.forEach((item, idx) => {
        const bg = idx % 2 === 0 ? "FFFFFF" : "F9FAFB";
        const statusText = item.status === 'epuise' ? 'Epuise' : item.status === 'bas' ? 'Stock bas' : 'Normal';

        ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: item.name, s: { ...cl(bg), font: { bold: true, sz: 10 } } };
        ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: item.category, s: cc(bg) };
        ws[XLSX.utils.encode_cell({ r, c: 2 })] = { v: Number(item.quantity) || 0, t: 'n', s: cr(bg) };
        ws[XLSX.utils.encode_cell({ r, c: 3 })] = { v: item.unit, s: cc(bg) };
        ws[XLSX.utils.encode_cell({ r, c: 4 })] = { v: Number(item.price) || 0, t: 'n', s: { ...cr(bg), numFmt: '#,##0.00' } };
        ws[XLSX.utils.encode_cell({ r, c: 5 })] = { v: Number(item.value) || 0, t: 'n', s: { ...cr(bg), numFmt: '#,##0' } };
        ws[XLSX.utils.encode_cell({ r, c: 6 })] = { v: statusText, s: statusCell(item.status) };
        r++;
      });

      // Total row
      const totQty = filteredStock.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
      const totVal = filteredStock.reduce((s, i) => s + (Number(i.value) || 0), 0);

      ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: 'TOTAL', s: { ...totalStyle, alignment: { horizontal: "left" } } };
      ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: filteredStock.length + ' produits', s: { ...totalStyle, alignment: { horizontal: "center" } } };
      ws[XLSX.utils.encode_cell({ r, c: 2 })] = { v: totQty, t: 'n', s: totalStyle };
      ws[XLSX.utils.encode_cell({ r, c: 3 })] = { v: '', s: totalStyle };
      ws[XLSX.utils.encode_cell({ r, c: 4 })] = { v: '', s: totalStyle };
      ws[XLSX.utils.encode_cell({ r, c: 5 })] = { v: totVal, t: 'n', s: { ...totalStyle, numFmt: '#,##0' } };
      ws[XLSX.utils.encode_cell({ r, c: 6 })] = { v: '', s: totalStyle };

      ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: cols - 1 } });
      ws['!cols'] = [{ wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 14 }];
      ws['!rows'] = [{ hpt: 30 }, { hpt: 10 }, { hpt: 22 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Stock Global');

      XLSX.writeFile(wb, 'Stock_Global.xlsx');
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setFilterCategory('ALL');
    setFilterStock('ALL');
  };

  const getCategoryColor = (cat) => {
    const colors = { ENGRAIS: 'green', PHYTOSANITAIRES: 'blue', ACIDES: 'orange', AUTRES: 'gray', INVESTISSEMENT: 'purple' };
    return colors[cat] || 'gray';
  };

  const getStatusBadge = (status) => {
    if (status === 'epuise') return <Badge color="red">Épuisé</Badge>;
    if (status === 'bas') return <Badge color="orange">Stock bas</Badge>;
    return <Badge color="green">OK</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Global</h1>
          <p className="text-gray-500 mt-1">
            {filterStock === 'epuise' ? '🔴 Produits épuisés' : 
             filterStock === 'bas' ? '⚠️ Stocks bas' : 
             'Inventaire du magasin central'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={resetFilters}>🔄 Reset</Button>
          <Button variant="secondary" onClick={handleExport}>📥 Export</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon="📦" label="Produits" value={stats.totalProducts} color="blue" />
        <StatCard icon="📊" label="Quantité" value={fmt(stats.totalQuantity)} color="purple" />
        <StatCard icon="💰" label="Valeur" value={fmtMoney(stats.totalValue)} color="green" />
        <div 
          onClick={() => setFilterStock(filterStock === 'epuise' ? 'ALL' : 'epuise')}
          className={`cursor-pointer transition-all ${filterStock === 'epuise' ? 'ring-2 ring-red-500' : 'hover:scale-[1.02]'}`}
        >
          <StatCard icon="🔴" label="Épuisé" value={stats.epuiseCount} color="red" />
        </div>
        <div 
          onClick={() => setFilterStock(filterStock === 'bas' ? 'ALL' : 'bas')}
          className={`cursor-pointer transition-all ${filterStock === 'bas' ? 'ring-2 ring-orange-500' : 'hover:scale-[1.02]'}`}
        >
          <StatCard icon="⚠️" label="Stock bas" value={stats.basCount} color="orange" />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'ALL', label: 'Tous', icon: '📦' },
          { id: 'epuise', label: 'Épuisé', icon: '🔴' },
          { id: 'bas', label: 'Stock bas', icon: '⚠️' },
          { id: 'normal', label: 'Normal', icon: '✅' }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilterStock(f.id)}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
              filterStock === f.id 
                ? 'bg-blue-500 text-white shadow-lg' 
                : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300'
            }`}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input placeholder="🔍 Rechercher un produit..." value={search} onChange={setSearch} />
          </div>
          <Select 
            value={filterCategory} 
            onChange={setFilterCategory}
            options={[
              { value: 'ALL', label: 'Toutes les catégories' },
              ...CATEGORIES.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))
            ]}
            className="md:w-56"
          />
        </div>
      </Card>

      {/* Category Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {CATEGORIES.map(cat => {
          const data = categorySummary[cat.id] || { count: 0, value: 0 };
          const isActive = filterCategory === cat.id;
          return (
            <Card 
              key={cat.id}
              onClick={() => setFilterCategory(isActive ? 'ALL' : cat.id)}
              className={`cursor-pointer transition-all text-center ${
                isActive ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
              }`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <p className="text-xs text-gray-500 mt-1">{cat.name}</p>
              <p className="text-lg font-bold text-gray-900">{data.count}</p>
              <p className="text-xs text-gray-400">{fmtMoney(data.value)}</p>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      <Card>
        {filteredStock.length === 0 ? (
          <EmptyState icon="📦" message="Aucun produit trouvé" action={
            <Button onClick={resetFilters}>Réinitialiser filtres</Button>
          } />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                    Produit {sortBy === 'name' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th>Catégorie</th>
                  <th className="text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('quantity')}>
                    Quantité {sortBy === 'quantity' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="text-right">Prix Moy.</th>
                  <th className="text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('value')}>
                    Valeur {sortBy === 'value' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="text-center">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((item, idx) => (
                  <tr key={idx} className={item.status === 'epuise' ? 'bg-red-50' : item.status === 'bas' ? 'bg-orange-50' : ''}>
                    <td className="font-medium text-gray-900">{item.name}</td>
                    <td><Badge color={getCategoryColor(item.category)}>{item.category}</Badge></td>
                    <td className={`text-right font-semibold ${item.status === 'epuise' ? 'text-red-600' : item.status === 'bas' ? 'text-orange-600' : 'text-gray-900'}`}>
                      {fmt(item.quantity)} {item.unit}
                    </td>
                    <td className="text-right text-gray-600">{fmtMoney(item.price)}</td>
                    <td className="text-right font-semibold text-green-600">{fmtMoney(item.value)}</td>
                    <td className="text-center">{getStatusBadge(item.status)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={2}>TOTAL ({filteredStock.length} produits)</td>
                  <td className="text-right">{fmt(stats.totalQuantity)}</td>
                  <td></td>
                  <td className="text-right text-green-600">{fmtMoney(stats.totalValue)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Stock;
