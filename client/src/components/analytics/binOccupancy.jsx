import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllCurrentMaterialPresenceAtAllLocations } from "../../features/materialMovement/materialMovementSlice";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Professional corporate palette (Deep Indigo, Emerald, Amber, Crimson)
const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444'];

const BinOccupancy = () => {
    const dispatch = useDispatch();
    const { data, loading } = useSelector((state) => state.materialMovement);

    useEffect(() => {
        dispatch(fetchAllCurrentMaterialPresenceAtAllLocations());  
    }, [dispatch]);

    const getActiveBinData = (rootNode) => {
        if (!rootNode) return { chartData: [], totalCapacity: 0, totalFilled: 0, activeBinsCount: 0, totalBinsCount: 0 };
        
        const materialMap = {};
        let totalCapacity = 0;
        let totalFilled = 0;
        let activeBinsCount = 0;
        let totalBinsCount = 0;

        const traverse = (node) => {
            const isBin = node.type === 'bin' || (!node.children || node.children.length === 0);

            if (isBin) {
                totalBinsCount++;
                const binCapacity = node.attributes?.capacity || 0;
                totalCapacity += binCapacity;

                if (Array.isArray(node.materials) && node.materials.length > 0) {
                    activeBinsCount++;
                    node.materials.forEach(mat => {
                        const matName = typeof mat === 'string' ? mat : (mat.name || node.name || 'Active Stock');
                        const quantity = mat.quantity || 1; 

                        materialMap[matName] = (materialMap[matName] || 0) + quantity;
                        totalFilled += quantity;
                    });
                }
            }

            if (Array.isArray(node.children)) {
                node.children.forEach(traverse);
            }
        };

        traverse(rootNode);

        const chartData = Object.keys(materialMap).map(key => ({
            name: key,
            value: materialMap[key]
        }));

        return { chartData, totalCapacity, totalFilled, activeBinsCount, totalBinsCount };
    };

    if (loading) return <div style={styles.centerText}>Loading material data...</div>;
    if (!data) return <div style={styles.centerText}>No warehouse data available.</div>;

    const rootLocation = Array.isArray(data) ? data[0] : data;
    const { chartData, totalCapacity, totalFilled, activeBinsCount, totalBinsCount } = getActiveBinData(rootLocation);

    // Dynamic safety calculation for utilization percentage
    const utilizationPercentage = totalCapacity > 0 ? ((totalFilled / totalCapacity) * 100) : 0;

    return (
        <div style={styles.container}>
            {/* Header Block */}
            <div style={styles.header}>
                <h3 style={styles.title}>Active Material Distribution</h3>
                <p style={styles.subtitle}>
                    Representing {activeBinsCount} active locations out of {totalBinsCount} total bins
                </p>
            </div>

            {/* Capacity Progress Bar Component */}
            <div style={styles.progressContainer}>
                <div style={styles.progressLabels}>
                    <span style={styles.progressLabelLeft}>Total Capacity Utilization</span>
                    <span style={styles.progressLabelRight}>{utilizationPercentage.toFixed(1)}% Full</span>
                </div>
                <div style={styles.progressBarBg}>
                    <div style={{ ...styles.progressBarFill, width: `${Math.min(utilizationPercentage, 100)}%` }} />
                </div>
                <div style={styles.progressSubtext}>
                    {totalFilled.toLocaleString()} units filled &bull; {(totalCapacity - totalFilled).toLocaleString()} units available space
                </div>
            </div>

            <hr style={styles.divider} />

            {/* Chart Area / Empty State Rendering */}
            {chartData.length === 0 ? (
                <div style={styles.emptyState}>All bins are currently empty (0 / {totalCapacity || '—'} Capacity)</div>
            ) : (
                <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="45%"
                                innerRadius={0}       
                                outerRadius={95}      
                                dataKey="value"
                                labelLine={true}      
                                label={({ name, value, percent }) => `${name}: ${value} units (${(percent * 100).toFixed(0)}%)`}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1E293B', borderRadius: '6px', border: 'none', color: '#FFF' }}
                                itemStyle={{ color: '#FFF' }}
                                formatter={(value) => [`${value} Units`, 'Current Load']} 
                            />
                            <Legend 
                                verticalAlign="bottom" 
                                iconType="circle" 
                                iconSize={8}
                                wrapperStyle={{ fontSize: '13px', color: '#475569' }} 
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

// Clean Executive Styles
const styles = {
    container: {
        maxWidth: '100%',
        margin: '20px auto',
        padding: '24px',
        background: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        border: '1px solid #E2E8F0',
        fontFamily: 'Inter, system-ui, sans-serif'
    },
    header: {
        textAlign: 'center',
        marginBottom: '20px'
    },
    title: {
        margin: '0 0 4px 0',
        color: '#0F172A',
        fontSize: '1.2rem',
        fontWeight: '600'
    },
    subtitle: {
        margin: 0,
        color: '#64748B',
        fontSize: '0.85rem'
    },
    progressContainer: {
        marginBottom: '16px',
        padding: '0 4px'
    },
    progressLabels: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '6px',
        fontSize: '0.85rem',
        fontWeight: '500'
    },
    progressLabelLeft: {
        color: '#334155'
    },
    progressLabelRight: {
        color: '#4F46E5',
        fontWeight: '600'
    },
    progressBarBg: {
        width: '100%',
        height: '8px',
        background: '#F1F5F9',
        borderRadius: '9999px',
        overflow: 'hidden',
        border: '1px solid #E2E8F0'
    },
    progressBarFill: {
        height: '100%',
        background: 'linear-gradient(90deg, #6366F1 0%, #4F46E5 100%)',
        borderRadius: '9999px',
        transition: 'width 0.5s ease-out'
    },
    progressSubtext: {
        fontSize: '0.75rem',
        color: '#64748B',
        marginTop: '6px',
        textAlign: 'left'
    },
    divider: {
        border: 'none',
        borderTop: '1px solid #F1F5F9',
        marginBottom: '16px'
    },
    centerText: {
        textAlign: 'center',
        padding: '40px',
        color: '#64748b'
    },
    emptyState: {
        textAlign: 'center',
        padding: '50px 0',
        color: '#94a3b8',
        fontStyle: 'italic'
    }
};

export default BinOccupancy;

