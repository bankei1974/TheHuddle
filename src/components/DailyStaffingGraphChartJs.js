import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { toFont } from 'chart.js/helpers';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const DailyStaffingGraphChartJs = ({ graphData }) => {
    console.log('DailyStaffingGraphChartJs rendering', graphData);

    const externalTooltipHandler = (context) => {
        // Tooltip Element
        let tooltipEl = document.getElementById('chartjs-tooltip');

        // Create element on first render
        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.id = 'chartjs-tooltip';
            tooltipEl.innerHTML = '<table></table>';
            document.body.appendChild(tooltipEl);
        }

        // Hide if no tooltip
        const tooltipModel = context.tooltip;
        if (tooltipModel.opacity === 0) {
            tooltipEl.style.opacity = 0;
            return;
        }

        // Set caret Position
        tooltipEl.classList.remove('above', 'below', 'no-transform');
        if (tooltipModel.yAlign) {
            tooltipEl.classList.add(tooltipModel.yAlign);
        } else {
            tooltipEl.classList.add('no-transform');
        }

        // Set Text
        if (tooltipModel.body) {
            const dataIndex = tooltipModel.dataPoints[0].dataIndex;
            const timeLabel = context.chart.data.labels[dataIndex]; // Access labels from chart data
            const productiveStaffCount = context.chart.data.datasets[0].data[dataIndex]; // Access productive staff count
            const productiveStaffNames = graphData[dataIndex].productiveStaffNames || []; // Access productive staff names

            let innerHtml = `<thead>`;
            innerHtml += `<tr><th>Time: ${timeLabel}</th></tr>`;
            innerHtml += `</thead><tbody>`;
            innerHtml += `<tr><td>Productive Staff: ${productiveStaffCount}</td></tr>`;

            if (productiveStaffNames.length > 0) {
                innerHtml += `<tr><td>Staff Members:</td></tr>`;
                productiveStaffNames.forEach(function(name) {
                    innerHtml += `<tr><td>- ${name}</td></tr>`;
                });
            }

            // Add other metrics if they exist
            if (context.chart.data.datasets.length > 1) { // Check if other datasets exist
                // Assuming Patient Census is the 4th dataset (index 3)
                if (context.chart.data.datasets[3] && context.chart.data.datasets[3].data[dataIndex] !== undefined) {
                    innerHtml += `<tr><td>Patient Census: ${graphData[dataIndex]['Patient Census']}</td></tr>`;
                }
                // Assuming Minimum Staff is the 2nd dataset (index 1)
                if (context.chart.data.datasets[1] && context.chart.data.datasets[1].data[dataIndex] !== undefined) {
                    innerHtml += `<tr><td>Minimum Staff: ${graphData[dataIndex]['Minimum Staff']}</td></tr>`;
                }
                // Assuming Optimal Staff is the 3rd dataset (index 2)
                if (context.chart.data.datasets[2] && context.chart.data.datasets[2].data[dataIndex] !== undefined) {
                    innerHtml += `<tr><td>Optimal Staff: ${graphData[dataIndex]['Optimal Staff']}</td></tr>`;
                }
            }

            innerHtml += `</tbody>`;

            let tableRoot = tooltipEl.querySelector('table');
            tableRoot.innerHTML = innerHtml;
        }

        const position = context.chart.canvas.getBoundingClientRect();
        const bodyFont = toFont(context.chart.options.plugins.tooltip.bodyFont || ChartJS.defaults.font);

        // Display, position, and set styles for tooltip
        tooltipEl.style.opacity = 1;
        tooltipEl.style.position = 'absolute';
        tooltipEl.style.left = position.left + window.pageXOffset + tooltipModel.caretX + 'px';
        tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY + 'px';
        tooltipEl.style.font = bodyFont;
        tooltipEl.style.padding = tooltipModel.padding + 'px ' + tooltipModel.padding + 'px';
        tooltipEl.style.pointerEvents = 'none';
        tooltipEl.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        tooltipEl.style.color = 'white';
        tooltipEl.style.borderRadius = '4px';
        tooltipEl.style.zIndex = 1000; // Ensure it's on top
    };

    const data = {
        labels: graphData.map(d => d.time),
        datasets: [
            {
                label: 'Productive Staff',
                data: graphData.map(d => d['Productive Staff']),
                borderColor: '#8884d8',
                backgroundColor: 'rgba(136, 132, 216, 0.2)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 1.5,
            },
            {
                label: 'Minimum Staff',
                data: graphData.map(d => d['Minimum Staff']),
                borderColor: '#FBBF24',
                fill: false,
                pointRadius: 0,
                borderWidth: 1.5,
            },
            {
                label: 'Optimal Staff',
                data: graphData.map(d => d['Optimal Staff']),
                borderColor: '#34D399',
                fill: false,
                pointRadius: 0,
                borderWidth: 1.5,
            },
        ],
    };

    if (graphData && graphData.length > 0 && graphData[0].hasOwnProperty('Patient Census')) {
        data.datasets.push({
            label: 'Patient Census',
            data: graphData.map(d => d['Patient Census']),
            borderColor: '#FF0000',
            fill: false,
            pointRadius: 0,
            borderWidth: 1.5,
        });
    }

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#9CA3AF',
                },
            },
            title: {
                display: true,
                text: 'Daily Staffing Overview',
                color: '#E5E7EB',
                font: {
                    size: 18,
                },
            },
            tooltip: {
                enabled: false,
                external: externalTooltipHandler
            }
        },
        scales: {
            x: {
                ticks: {
                    color: '#9CA3AF',
                },
                grid: {
                    color: '#4B5563',
                },
            },
            y: {
                ticks: {
                    color: '#9CA3AF',
                },
                grid: {
                    color: '#4B5563',
                },
            },
        },
    };

    return <Line options={options} data={data} />;
};

export default DailyStaffingGraphChartJs;