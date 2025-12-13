import React, { useMemo, useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

interface ReportChartProps {
  monthlyAttendance: { [monthYear: string]: number };
  height?: string;
  barColor?: string; // HEX Code
}

const ReportChart: React.FC<ReportChartProps> = ({ monthlyAttendance, height = '300px', barColor }) => {
  const [chartThemeColors, setChartThemeColors] = useState({
    textSecondary: '#64748b' // slate-500
  });

  useEffect(() => {
    const rootStyles = getComputedStyle(document.documentElement);
    const textSecondaryColor = rootStyles.getPropertyValue('--color-text-secondary').trim() || '#64748b';
    setChartThemeColors({ textSecondary: textSecondaryColor });
  }, []);

  const chartData = useMemo(() => {
    const sortedMonths = Object.keys(monthlyAttendance).sort((a, b) => {
        const aDate = new Date(`01 ${a}`);
        const bDate = new Date(`01 ${b}`);
        return aDate.getTime() - bDate.getTime();
    });

    const labels = sortedMonths.map(monthYear => {
        const month = monthYear.split(' ')[0];
        return month.charAt(0).toUpperCase() + month.slice(1);
    });
    const data = sortedMonths.map(monthYear => monthlyAttendance[monthYear]);
    
    // Fallback color if none provided
    const backgroundColor = barColor || '#3b82f6';

    return {
      labels: labels,
      datasets: [
        {
          label: 'Asistencia Promedio (%)',
          data: data,
          backgroundColor: backgroundColor,
          borderColor: backgroundColor,
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.6,
        },
      ],
    };
  }, [monthlyAttendance, barColor]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
            callbacks: {
                label: function(context: any) {
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    if (context.parsed.y !== null) {
                        label += context.parsed.y.toFixed(1) + '%';
                    }
                    return label;
                }
            }
        },
      datalabels: {
        display: true,
        anchor: 'end' as const,
        align: 'top' as const,
        offset: -4, // Push it slightly inside if bar is tall, or outside if bar is short? 
        // Let's actually align 'end' and anchor 'end' to put it on top.
        // If we want it inside the bar: anchor: 'end', align: 'start'
        // If we want it outside (above) the bar: anchor: 'end', align: 'end'
        // Since the bar color changes, putting text *above* the bar in a consistent color (like gray) is safer.
        
        // Override for better visibility:
        // If bar is colored, let's put the number ON TOP of the bar in the text color of the theme.
        
        formatter: (value: number) => {
            return value.toFixed(1) + '%';
        },
        font: {
            weight: 'bold' as const,
            size: 12
        },
        // Dynamic color for the label based on where it sits?
        // To keep it simple and clean: Text above bar in dark gray.
        color: chartThemeColors.textSecondary, 
      }
    },
    scales: {
        y: {
            beginAtZero: true,
            max: 115, // Add padding at top for labels
            ticks: {
                stepSize: 20,
                color: chartThemeColors.textSecondary,
                callback: function(value: string | number) {
                    return value + '%';
                }
            },
            grid: {
                color: 'rgba(0, 0, 0, 0.05)',
            }
        },
        x: {
             ticks: {
                color: chartThemeColors.textSecondary,
            },
             grid: {
                display: false,
            }
        }
    }
  };

  return <div style={{ height }}><Bar options={options} data={chartData} /></div>;
};

export default React.memo(ReportChart);