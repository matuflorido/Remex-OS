import React, { useState } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { importBulkContactsInDb } from '../services/crmService';

export default function ImportContactsModal({ onClose }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [parsedData, setParsedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    
    setFile(uploadedFile);
    setError(null);

    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      delimiter: ';', 
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          setError("Error al leer el archivo. Verifica que sea un CSV válido separado por punto y coma (;).");
          return;
        }

        const mappedData = results.data.map(row => ({
          type: 'cliente',
          clientNumber: row['numero de cliente'] || '',
          fantasyName: row['NOMBRE FANTACIA'] || '',
          name: row['RAZON SOCIAL '] || row['NOMBRE FANTACIA'] || 'Sin Nombre',
          address: row['DIRECCION'] || '',
          city: row['LOCALIDAD'] || '',
          state: row['PROVINCIA'] || '',
          phone: row['TELEF'] || row['TELEF 1'] || '',
          whatsapp: row['WHATSAPP'] || '',
          email: row['EMAIL'] || '',
          contactPerson: row['CONTACTO'] || '',
          transport: row['TRANSPORTE'] || '',
          industry: row['RUBRO'] || '',
          zones: [], // Ahora es un array múltiple
          importRawZone: row['Zona Sistema '] || row['ZONA'] || '', // Guardamos lo del excel para el escáner
          history: []
        }));

        setParsedData(mappedData);
        setPreview(mappedData.slice(0, 3)); 
      }
    });
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setLoading(true);
    try {
      await importBulkContactsInDb(parsedData);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      setError("Hubo un error al subir los datos a Firebase.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex justify-center items-center p-4">
        <div className="bg-zinc-950 border border-emerald-900/50 p-12 rounded-3xl flex flex-col items-center max-w-sm shadow-[0_0_50px_rgba(16,185,129,0.2)]">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">¡Éxito Total!</h2>
          <p className="text-zinc-400 text-center text-sm font-bold">Se importaron {parsedData.length} clientes. Ahora ve a Gestor de Zonas y presiona Vincular.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex justify-center items-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-black text-white flex items-center gap-3">
            <UploadCloud className="w-6 h-6 text-orange-500" /> Importar Clientes (CSV)
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar">
          {error && (
            <div className="mb-6 bg-red-950/50 border border-red-900 text-red-500 p-4 rounded-xl flex items-center gap-3 text-sm font-bold">
              <AlertTriangle className="w-5 h-5 shrink-0"/> {error}
            </div>
          )}

          {!file ? (
            <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-12 flex flex-col items-center justify-center bg-black/50 hover:bg-zinc-900/50 transition-colors cursor-pointer relative group">
              <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
              <UploadCloud className="w-12 h-12 text-zinc-600 group-hover:text-orange-500 transition-colors mb-4" />
              <p className="text-white font-black text-lg mb-1">Cargar Archivo CSV</p>
              <p className="text-zinc-500 text-sm font-bold">Haz clic aquí o arrastra tu archivo</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-orange-500"/>
                  <div>
                    <p className="text-white font-bold text-sm">{file.name}</p>
                    <p className="text-emerald-500 text-xs font-black">{parsedData.length} registros listos para importar</p>
                  </div>
                </div>
                <button onClick={() => setFile(null)} className="text-xs text-zinc-500 hover:text-white font-bold">Cambiar archivo</button>
              </div>

              <div>
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">Vista Previa de Datos (Primeros 3)</h3>
                <div className="overflow-x-auto border border-zinc-800 rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-900/50">
                      <tr>
                        <th className="p-3 text-zinc-400 font-bold">Nº Cliente</th>
                        <th className="p-3 text-zinc-400 font-bold">Razón Social</th>
                        <th className="p-3 text-zinc-400 font-bold">Localidad</th>
                        <th className="p-3 text-zinc-400 font-bold">Zona del Archivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 bg-black">
                      {preview.map((row, i) => (
                        <tr key={i}>
                          <td className="p-3 text-zinc-300">{row.clientNumber}</td>
                          <td className="p-3 text-zinc-300 font-bold">{row.name}</td>
                          <td className="p-3 text-zinc-500">{row.city}</td>
                          <td className="p-3 text-orange-400">{row.importRawZone}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-800 bg-zinc-900 shrink-0 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-sm text-zinc-400 hover:text-white hover:bg-zinc-800">
            CANCELAR
          </button>
          <button 
            onClick={handleImport} 
            disabled={loading || !file || parsedData.length === 0} 
            className="bg-orange-600 hover:bg-orange-500 text-black font-black px-8 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin"/> MIGRANDO DATOS...</> : 'INICIAR IMPORTACIÓN MASIVA'}
          </button>
        </div>
      </div>
    </div>
  );
}