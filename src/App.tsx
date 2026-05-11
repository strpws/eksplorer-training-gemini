/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Search, RotateCcw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProdiData {
  universitas: string;
  provinsi: string;
  kota: string;
  prodi: string;
  bidang: string;
  jenjang: string;
  daya_tampung_2026: number;
  peminat_2025: number | null;
  rasio: number | null;
  rasio_str: string;
  situs: string;
}

type SortField = keyof ProdiData;
type SortOrder = 'asc' | 'desc';

export default function App() {
  const [data, setData] = useState<ProdiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterProvinsi, setFilterProvinsi] = useState('Semua Provinsi');
  const [filterUniversitas, setFilterUniversitas] = useState('Semua PTN');
  const [filterBidang, setFilterBidang] = useState('Semua Bidang');
  const [filterJenjang, setFilterJenjang] = useState('Semua Jenjang');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('rasio');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetch('./data.txt')
      .then(res => {
        if (!res.ok) throw new Error('Gagal memuat data');
        return res.text();
      })
      .then(text => {
        const lines = text.trim().split('\n');
        if (lines.length < 2) {
          setData([]);
          setLoading(false);
          return;
        }

        const headers = lines[0].split('\t').map(h => h.trim());
        
        const parsed = lines.slice(1).map(line => {
          const values = line.split('\t').map(v => v.trim());
          const row: any = {};
          
          headers.forEach((header, i) => {
            const val = values[i];
            
            // Map headers to internal keys
            if (header === 'Universitas') row.universitas = val;
            else if (header === 'Provinsi') row.provinsi = val;
            else if (header === 'Kota') row.kota = val;
            else if (header === 'Program Studi') row.prodi = val;
            else if (header === 'Bidang Ilmu') row.bidang = val;
            else if (header === 'Jenjang') row.jenjang = val;
            else if (header === 'Daya Tampung 2026') row.daya_tampung_2026 = val ? parseInt(val) : 0;
            else if (header === 'Peminat 2025 (Num)') row.peminat_2025 = val ? parseInt(val) : null;
            else if (header === 'Rasio') row.rasio_str = val;
            else if (header === 'Situs') row.situs = val;
          });

          // Calculate numerical ratio for sorting/badges if not provided or to be consistent
          if (row.daya_tampung_2026 > 0 && row.peminat_2025 !== null) {
            row.rasio = row.peminat_2025 / row.daya_tampung_2026;
          } else {
            row.rasio = null;
          }

          return row as ProdiData;
        });
        setData(parsed);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Filter options derived from data
  const filterOptions = useMemo(() => {
    if (data.length === 0) return { provinsis: [], universitas: [], bidangs: [], jenjangs: [] };
    
    return {
      provinsis: ['Semua Provinsi', ...Array.from(new Set(data.map(d => d.provinsi))).sort()],
      universitas: ['Semua PTN', ...Array.from(new Set(data.map(d => d.universitas))).sort()],
      bidangs: ['Semua Bidang', ...Array.from(new Set(data.map(d => d.bidang))).sort()],
      jenjangs: ['Semua Jenjang', ...Array.from(new Set(data.map(d => d.jenjang))).sort()]
    };
  }, [data]);

  // Filtering Logic
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchSearch = item.prodi.toLowerCase().includes(search.toLowerCase()) || 
                          item.universitas.toLowerCase().includes(search.toLowerCase());
      const matchProvinsi = filterProvinsi === 'Semua Provinsi' || item.provinsi === filterProvinsi;
      const matchUniversitas = filterUniversitas === 'Semua PTN' || item.universitas === filterUniversitas;
      const matchBidang = filterBidang === 'Semua Bidang' || item.bidang === filterBidang;
      const matchJenjang = filterJenjang === 'Semua Jenjang' || item.jenjang === filterJenjang;
      
      return matchSearch && matchProvinsi && matchUniversitas && matchBidang && matchJenjang;
    });
  }, [data, search, filterProvinsi, filterUniversitas, filterBidang, filterJenjang]);

  // Sorting Logic
  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredData, sortField, sortOrder]);

  // Summary Metrics
  const summary = useMemo(() => {
    const ptnCount = new Set(filteredData.map(d => d.universitas)).size;
    const totalDayaTampung = filteredData.reduce((acc, d) => acc + (d.daya_tampung_2026 || 0), 0);
    const totalPeminat = filteredData.reduce((acc, d) => acc + (d.peminat_2025 || 0), 0);
    
    return {
      prodiCount: filteredData.length,
      ptnCount,
      totalDayaTampung,
      totalPeminat
    };
  }, [filteredData]);

  // Pagination Logic
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleReset = () => {
    setSearch('');
    setFilterProvinsi('Semua Provinsi');
    setFilterUniversitas('Semua PTN');
    setFilterBidang('Semua Bidang');
    setFilterJenjang('Semua Jenjang');
    setSortField('rasio');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatNumber = (num: number | null) => {
    if (num === null) return '-';
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
  };

  const getRasioBadge = (rasio: number | null) => {
    if (rasio === null) {
      return <span className="text-gray-400 italic font-sans text-xs">Prodi baru</span>;
    }
    
    let bgColor = 'bg-gray-100 text-gray-800';
    let text = rasio.toFixed(2);
    
    if (rasio >= 10) {
      bgColor = 'bg-blue-600 text-white';
      text = `${rasio.toFixed(2)} — ketat banget`;
    } else if (rasio >= 3) {
      bgColor = 'bg-kompas-gold text-black';
    } else {
      bgColor = 'bg-green-600 text-white';
    }
    
    return (
      <span className={`${bgColor} px-2 py-0.5 rounded-full text-[10px] font-bold font-sans uppercase tracking-wider`}>
        {text}
      </span>
    );
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 rounded-full border-4 border-kompas-blue border-t-transparent animate-spin mb-4" />
        <p className="font-sans text-kompas-blue font-bold tracking-widest uppercase">Memuat Data...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="max-w-md text-center">
        <h2 className="title text-2xl text-kompas-red mb-2">Terjadi Kesalahan</h2>
        <p className="body-text mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-kompas-blue text-white px-4 py-2 rounded font-sans font-bold">Coba Lagi</button>
      </div>
    </div>
  );

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <header className="mb-10 text-center md:text-left">
        <div className="keyword text-sm mb-2">Data Pendidikan</div>
        <h1 className="title text-4xl md:text-5xl lg:text-[42px] text-kompas-black mb-4">
          Jelajahi Daya Tampung & Peminat <span className="text-kompas-blue">SNBT-UTBK 2026</span>
        </h1>
        <p className="body-text text-lg text-kompas-gray max-w-4xl">
          Gunakan alat interaktif ini untuk membandingkan keketatan program studi antar Perguruan Tinggi Negeri (PTN) seluruh Indonesia sebagai panduan pendaftaran.
        </p>
      </header>

      {/* Filter Panel */}
      <section className="bg-gray-50 border border-kompas-border p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          {/* Provinsi */}
          <div>
            <label className="chart-text-bold text-[11px] uppercase mb-1 block text-kompas-gray">Provinsi</label>
            <select 
              value={filterProvinsi}
              onChange={(e) => { setFilterProvinsi(e.target.value); setCurrentPage(1); }}
              className="w-full p-2 border border-gray-300 bg-white font-sans text-sm sharp-input"
            >
              {filterOptions.provinsis.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          {/* Universitas */}
          <div>
            <label className="chart-text-bold text-[11px] uppercase mb-1 block text-kompas-gray">PTN</label>
            <select 
              value={filterUniversitas}
              onChange={(e) => { setFilterUniversitas(e.target.value); setCurrentPage(1); }}
              className="w-full p-2 border border-gray-300 bg-white font-sans text-sm sharp-input"
            >
              {filterOptions.universitas.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          {/* Bidang Ilmu */}
          <div>
            <label className="chart-text-bold text-[11px] uppercase mb-1 block text-kompas-gray">Bidang Ilmu</label>
            <select 
              value={filterBidang}
              onChange={(e) => { setFilterBidang(e.target.value); setCurrentPage(1); }}
              className="w-full p-2 border border-gray-300 bg-white font-sans text-sm sharp-input"
            >
              {filterOptions.bidangs.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          {/* Jenjang */}
          <div>
            <label className="chart-text-bold text-[11px] uppercase mb-1 block text-kompas-gray">Jenjang</label>
            <select 
              value={filterJenjang}
              onChange={(e) => { setFilterJenjang(e.target.value); setCurrentPage(1); }}
              className="w-full p-2 border border-gray-300 bg-white font-sans text-sm sharp-input"
            >
              {filterOptions.jenjangs.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          {/* Search */}
          <div className="lg:col-span-1">
            <label className="chart-text-bold text-[11px] uppercase mb-1 block text-kompas-gray">Cari Prodi</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Ketik nama prodi..." 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 bg-white font-sans text-sm sharp-input"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Reset */}
          <div>
            <button 
              onClick={handleReset}
              className="w-full py-2 bg-white border border-kompas-red text-kompas-red font-sans font-bold text-xs uppercase hover:bg-red-50 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      {/* Summary Bar */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 pb-4 bold-divider">
        <div className="stat-item">
          <p className="chart-text text-kompas-gray text-[12px] uppercase mb-1">Prodi Ditampilkan</p>
          <p className="chart-text-bold text-2xl lg:text-3xl text-kompas-black leading-none">{formatNumber(summary.prodiCount)}</p>
        </div>
        <div className="stat-item">
          <p className="chart-text text-kompas-gray text-[12px] uppercase mb-1">Jumlah PTN</p>
          <p className="chart-text-bold text-2xl lg:text-3xl text-kompas-black leading-none">{formatNumber(summary.ptnCount)}</p>
        </div>
        <div className="stat-item">
          <p className="chart-text text-kompas-gray text-[12px] uppercase mb-1">Daya Tampung 2026</p>
          <p className="chart-text-bold text-2xl lg:text-3xl text-kompas-black leading-none">{formatNumber(summary.totalDayaTampung)}</p>
        </div>
        <div className="stat-item">
          <p className="chart-text text-kompas-gray text-[12px] uppercase mb-1">Peminat 2025</p>
          <p className="chart-text-bold text-2xl lg:text-3xl text-kompas-black leading-none">{formatNumber(summary.totalPeminat)}</p>
        </div>
      </section>

      {/* Main Table */}
      <div className="bg-white border border-kompas-border mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px] font-sans text-[13px]">
            <thead className="bold-header sticky top-0 z-10">
              <tr>
                <th className="p-3 font-bold uppercase text-[11px] tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => toggleSort('universitas')}>
                  <div className="flex items-center gap-1">PTN <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="p-3 font-bold uppercase text-[11px] tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => toggleSort('prodi')}>
                  <div className="flex items-center gap-1">Program Studi <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="p-3 font-bold uppercase text-[11px] tracking-wider cursor-pointer hidden md:table-cell hover:bg-gray-200 transition-colors" onClick={() => toggleSort('bidang')}>
                  <div className="flex items-center gap-1">Bidang <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="p-3 font-bold uppercase text-[11px] tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => toggleSort('jenjang')}>
                  <div className="flex items-center gap-1">Jenjang <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="p-3 font-bold uppercase text-[11px] tracking-wider text-right cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => toggleSort('daya_tampung_2026')}>
                  <div className="flex items-center justify-end gap-1">Daya Tampung 26 <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="p-3 font-bold uppercase text-[11px] tracking-wider text-right cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => toggleSort('peminat_2025')}>
                  <div className="flex items-center justify-end gap-1">Peminat 25 <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="p-3 font-bold uppercase text-[11px] tracking-wider text-right cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => toggleSort('rasio')}>
                  <div className="flex items-center justify-end gap-1">Rasio Keketatan <ArrowUpDown className="h-3 w-3" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kompas-border">
              <AnimatePresence mode="popLayout">
                {paginatedData.length > 0 ? (
                  paginatedData.map((item, idx) => (
                    <motion.tr 
                      key={`${item.universitas}-${item.prodi}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="p-3 font-bold text-sm text-kompas-blue">
                        {item.situs ? (
                          <a href={item.situs} target="_blank" rel="noreferrer" className="hover:underline">
                            {item.universitas}
                          </a>
                        ) : (
                          item.universitas
                        )}
                      </td>
                      <td className="p-3 text-sm font-medium">{item.prodi}</td>
                      <td className="p-3 text-xs hidden md:table-cell">{item.bidang}</td>
                      <td className="p-3 text-xs uppercase font-bold text-kompas-gray">{item.jenjang}</td>
                      <td className="p-3 text-sm text-right tabular-nums">{formatNumber(item.daya_tampung_2026)}</td>
                      <td className="p-3 text-sm text-right tabular-nums">{formatNumber(item.peminat_2025)}</td>
                      <td className="p-3 text-right">{getRasioBadge(item.rasio)}</td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-12 text-center body-text text-gray-400">
                      Tidak ada data yang sesuai dengan penyaring Anda.
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination & Status */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 font-sans text-[13px]">
        <p className="text-kompas-gray">
          Menampilkan <span className="font-bold text-kompas-black">{sortedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–{Math.min(currentPage * itemsPerPage, sortedData.length)}</span> dari <span className="font-bold text-kompas-black">{formatNumber(sortedData.length)}</span> prodi
        </p>

        <div className="flex items-center gap-1">
          <button 
            disabled={currentPage === 1}
            onClick={() => handlePageChange(1)}
            className="p-2 border border-kompas-border bg-white hover:bg-gray-100 disabled:opacity-30 transition-colors"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button 
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
            className="p-2 border border-kompas-border bg-white hover:bg-gray-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <div className="flex gap-1 mx-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-9 h-9 border font-bold flex items-center justify-center transition-colors ${currentPage === pageNum ? 'bg-kompas-blue text-white border-kompas-blue' : 'bg-white border-kompas-border hover:bg-gray-100'}`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button 
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => handlePageChange(currentPage + 1)}
            className="p-2 border border-kompas-border bg-white hover:bg-gray-100 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button 
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => handlePageChange(totalPages)}
            className="p-2 border border-kompas-border bg-white hover:bg-gray-100 disabled:opacity-30 transition-colors"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 pt-6 border-t border-kompas-border">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-[11px] text-kompas-gray">
          <div className="body-text max-w-2xl">
            Sumber data: SNPMB | Rasio dihitung dari Peminat 2025 dibagi Daya Tampung 2026. <span className="italic">Prodi baru</span> belum memiliki data historis.
          </div>
          <div className="text-right">
            <span className="font-sans font-bold text-kompas-black">Diolah: KOMPAS/BG</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
