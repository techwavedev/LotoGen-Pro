import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { Loader2, RefreshCw } from 'lucide-react';

interface Delay3DData {
  x: number[];
  y: number[];
  z: number[];
}

interface DelayFrequency3DProps {
  lotteryId: string;
  lotteryColor: string;
}

const DelayFrequency3D: React.FC<DelayFrequency3DProps> = ({ lotteryId, lotteryColor }) => {
  const [data, setData] = useState<Delay3DData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/analytics/delay-3d/${lotteryId}`);
      
      if (!response.ok) {
        throw new Error('Falha ao carregar dados do servidor');
      }

      const result = await response.json();
      if (result.success && result.points) {
        setData(result.points);
      } else {
        throw new Error('Formato de dados inválido');
      }
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar o gráfico 3D.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [lotteryId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] bg-gray-50 rounded-lg border border-gray-100">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
        <span className="text-sm text-gray-500">Calculando mapa 3D no servidor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] bg-gray-50 rounded-lg border border-gray-100">
        <span className="text-sm text-red-500 mb-2">{error}</span>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Tentar Novamente
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="w-full h-[500px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur-sm p-2 rounded shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: lotteryColor }} />
            Frequência de Atrasos (3D)
          </h3>
          <p className="text-[10px] text-gray-500">
            Eixo X: Número | Eixo Y: Atraso (Concursos) | Eixo Z: Frequência
          </p>
      </div>

      <Plot
        data={[
          {
            x: data.x,
            y: data.y,
            z: data.z,
            mode: 'markers',
            type: 'scatter3d',
            marker: {
                size: 3,
                color: data.z, // Color by frequency
                colorscale: 'Viridis', 
                opacity: 0.8
            },
          }
        ]}
        layout={{
          autosize: true,
          margin: { l: 0, r: 0, b: 0, t: 0 },
          scene: {
            xaxis: { title: 'Número' },
            yaxis: { title: 'Atraso' },
            zaxis: { title: 'Frequência' },
            camera: {
                eye: { x: 1.5, y: 1.5, z: 1.5 }
            }
          },
          paper_bgcolor: 'rgba(0,0,0,0)',
        }}
        useResizeHandler={true}
        style={{ width: '100%', height: '100%' }}
        config={{ displayModeBar: false }}
      />
    </div>
  );
};

export default DelayFrequency3D;
