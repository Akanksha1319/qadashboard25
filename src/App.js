import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { CheckCircle, XCircle, Clock, PlayCircle, Upload, TrendingUp, Activity, Zap, Target, Award, AlertTriangle, ArrowLeft, FolderOpen, RefreshCw, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import './App.css';

// Memoized Components for Better Performance
const AnimatedCounter = React.memo(({ value, duration = 1000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!value) return;
    
    let start = 0;
    const end = parseInt(value);
    if (start === end) return;

    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      setCount(Math.floor(start));
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count}</span>;
});

const MetricCard = React.memo(({ title, value, subtitle, icon: Icon, iconColor, gradient, trend }) => (
  <div className={`metric-card ${gradient} animated-card`}>
    <div className="card-glow"></div>
    <div className="metric-header">
      <div className="metric-title-section">
        <span className="metric-title">{title}</span>
        {trend && (
          <span className={`trend ${trend > 0 ? 'trend-up' : 'trend-down'}`}>
            {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className={`metric-icon ${iconColor}`}>
        <Icon size={24} color="white" />
      </div>
    </div>
    <div className="metric-value">
      <AnimatedCounter value={value} />
    </div>
    {subtitle && <div className="metric-subtitle">{subtitle}</div>}
  </div>
));

// Projects Page Component
const ProjectsPage = ({ onSelectModel }) => {
  const projects = [
    { 
      id: 'model-i', 
      name: 'Model-I', 
      subtitle: 'Acera-1310',
      description: 'Functional Testing Summary', 
      color: '#8b5cf6' 
    },
    { 
      id: 'model-h', 
      name: 'Model-H', 
      subtitle: 'Acera-1320',
      description: 'Hardware Testing Dashboard', 
      color: '#3b82f6' 
    },
    { 
      id: 'model-k', 
      name: 'Model-K', 
      subtitle: 'Edimax 11be',
      description: 'Kernel Performance Metrics', 
      color: '#10b981' 
    }
  ];

  return (
    <div className="projects-page">
      <div className="projects-header">
        <FolderOpen size={64} color="white" className="floating-animation" />
        <h1 className="projects-title gradient-text">Projects</h1>
        <p className="projects-subtitle">Select a project to view its dashboard</p>
      </div>
      
      <div className="projects-grid">
        {projects.map((project) => (
          <div
            key={project.id}
            className="project-card"
            onClick={() => onSelectModel(project.id)}
            style={{ '--project-color': project.color }}
          >
            <div className="project-icon" style={{ backgroundColor: project.color }}>
              <Target size={32} color="white" />
            </div>
            <h3 className="project-name">{project.name}</h3>
            <p className="project-subtitle">{project.subtitle}</p>
            <p className="project-description">{project.description}</p>
            <div className="project-arrow">
              <ArrowLeft size={20} style={{ transform: 'rotate(180deg)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Dashboard Component with Enhanced Error Handling
const Dashboard = ({ selectedModel, onBackToProjects }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [csvFound, setCsvFound] = useState(false);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Model names mapping
  const modelNames = {
    'model-i': 'Acera-1310',
    'model-h': 'Acera-1320',
    'model-k': 'Edimax 11be'
  };

  // Column mapping function to handle different CSV formats
  const mapCSVColumns = useCallback((row) => {
    console.log('Mapping CSV columns from row:', row);
    
    // Create flexible column mapping
    const columnMap = {
      // Total Test Cases variations
      totalCases: row['Total Test Cases'] || row['Total Cases'] || row['Test Cases'] || 144,
      
      // Total Executed variations
      totalExecuted: row['Total Executed'] || row['Executed'] || row['Total Run'] || 132,
      
      // Total Passed variations
      totalPassed: row['Total Passed'] || row['Passed'] || row['Pass'] || 117,
      
      // Total Failed variations
      totalFailed: row['Total Failed'] || row['Failed'] || row['Fail'] || 6,
      
      // Need to Retest variations
      needToRetest: row['Need To Retest'] || row['Need to Retest'] || row['Retest'] || row['To Retest'] || 10,
      
      // Yet to validate - NEW COLUMN
      yetToValidate: row['Yet to validate'] || row['Yet To Validate'] || row['To Validate'] || row['Pending Validation'] || 6,
      
      // Total In Progress variations
      inProgress: row['Total In Progress'] || row['In Progress'] || row['Progress'] || row['Running'] || 2,
      
      // Percentage columns
      executionRate: parseFloat(row['% Execution'] || row['Execution Rate'] || row['Execution %']) || 0,
      passRate: parseFloat(row['% Passed'] || row['Pass Rate'] || row['Pass %']) || 0
    };

    // Calculate rates if not provided
    if (!columnMap.executionRate && columnMap.totalCases) {
      columnMap.executionRate = (columnMap.totalExecuted / columnMap.totalCases) * 100;
    }
    
    if (!columnMap.passRate && columnMap.totalExecuted) {
      columnMap.passRate = (columnMap.totalPassed / columnMap.totalExecuted) * 100;
    }

    // Calculate additional rates
    columnMap.retestRate = (columnMap.needToRetest / columnMap.totalCases) * 100;
    columnMap.validationRate = (columnMap.yetToValidate / columnMap.totalCases) * 100;

    console.log('Mapped data:', columnMap);
    return columnMap;
  }, []);

  // Memoized default data with all columns
  const defaultData = useMemo(() => ({
    totalCases: 144,
    totalExecuted: 132,
    totalPassed: 117,
    totalFailed: 6,
    needToRetest: 10,
    yetToValidate: 6,
    inProgress: 2,
    executionRate: 91.67,
    passRate: 88.64,
    retestRate: 6.94,
    validationRate: 4.17
  }), []);

  const currentData = data || defaultData;

  // Load CSV data from public folder with enhanced debugging
  useEffect(() => {
    const loadCSVData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(`Loading CSV data for ${selectedModel}`);
        console.log('Attempting to fetch CSV from /dashboard.csv');

        // First check if CSV file exists
        const response = await fetch('/dashboard.csv');
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
          console.warn(`CSV file not found (status: ${response.status}). Using default data.`);
          setCsvFound(false);
          setData(defaultData);
          setLoading(false);
          return;
        }
        
        const csvText = await response.text();
        console.log('CSV content loaded, length:', csvText.length);
        console.log('CSV first 200 characters:', csvText.substring(0, 200));

        if (!csvText || csvText.trim().length === 0) {
          console.warn('CSV file is empty. Using default data.');
          setCsvFound(false);
          setData(defaultData);
          setLoading(false);
          return;
        }

        setCsvFound(true);

        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          transformHeader: (header) => {
            const cleanHeader = header.trim();
            console.log('Processing header:', `"${header}" -> "${cleanHeader}"`);
            return cleanHeader;
          },
          complete: (results) => {
            console.log('Papa Parse completed');
            console.log('Results:', results);
            console.log('Data rows:', results.data.length);
            console.log('Parse errors:', results.errors);
            
            if (results.errors && results.errors.length > 0) {
              console.error('CSV parsing errors:', results.errors);
            }
            
            if (results.data && results.data.length > 0) {
              const row = results.data[0];
              console.log('First row data:', row);
              console.log('Available columns:', Object.keys(row));
              
              const mappedData = mapCSVColumns(row);
              setData(mappedData);
            } else {
              console.warn('No data found in CSV. Using default data.');
              setData(defaultData);
            }
            setLoading(false);
          },
          error: (err) => {
            console.error('Papa Parse error:', err);
            setError('CSV parsing failed: ' + err.message);
            setData(defaultData);
            setLoading(false);
          }
        });
      } catch (err) {
        console.error('CSV loading error:', err);
        console.log('Using default data due to error');
        setCsvFound(false);
        setData(defaultData);
        setLoading(false);
      }
    };

    // Load CSV for model-i, use default data for others
    if (selectedModel === 'model-i') {
      loadCSVData();
    } else {
      // For model-h and model-k, use default data immediately
      console.log(`Using default data for ${selectedModel}`);
      setData(defaultData);
      setCsvFound(false);
      setLoading(false);
    }
  }, [selectedModel, mapCSVColumns, defaultData]);

  // File upload handler for manual upload
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('Manual file upload:', file.name);
    setLoading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        console.log('Manual upload parsing completed');
        if (results.data && results.data.length > 0) {
          const row = results.data[0];
          console.log('Uploaded file data:', row);
          
          const mappedData = mapCSVColumns(row);
          setData(mappedData);
          setCsvFound(true);
        }
        setLoading(false);
      },
      error: (err) => {
        console.error('Manual upload error:', err);
        setError('Failed to parse uploaded file: ' + err.message);
        setLoading(false);
      }
    });
  }, [mapCSVColumns]);

  // Optimized time update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  // Optimized particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    const particleCount = window.innerWidth < 768 ? 20 : 30;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.size = Math.random() * 1.5 + 0.5;
        this.opacity = Math.random() * 0.3 + 0.1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      }

      draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    let lastTime = 0;
    const targetFPS = 30;
    const frameDelay = 1000 / targetFPS;

    const animate = (currentTime) => {
      if (currentTime - lastTime >= frameDelay) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(particle => {
          particle.update();
          particle.draw();
        });
        lastTime = currentTime;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Memoized chart data - Updated to include Yet to validate
  const barChartData = useMemo(() => [
    { name: 'Passed', value: currentData.totalPassed, color: '#10B981' },
    { name: 'Failed', value: currentData.totalFailed, color: '#EF4444' },
    { name: 'In Progress', value: currentData.inProgress, color: '#F59E0B' },
    { name: 'Need to Retest', value: currentData.needToRetest, color: '#8B5CF6' },
    { name: 'Yet to Validate', value: currentData.yetToValidate, color: '#F97316' },
    { name: 'Pending', value: Math.max(0, currentData.totalCases - currentData.totalExecuted - currentData.yetToValidate), color: '#6B7280' }
  ], [currentData]);

  const pieData = useMemo(() => [
    { name: 'Passed', value: currentData.totalPassed, color: '#10B981' },
    { name: 'Failed', value: currentData.totalFailed, color: '#EF4444' },
    { name: 'In Progress', value: currentData.inProgress, color: '#F59E0B' },
    { name: 'Need to Retest', value: currentData.needToRetest, color: '#8B5CF6' },
    { name: 'Yet to Validate', value: currentData.yetToValidate, color: '#F97316' },
    { name: 'Pending', value: Math.max(0, currentData.totalCases - currentData.totalExecuted - currentData.yetToValidate), color: '#6B7280' }
  ], [currentData]);

  if (loading) {
    return (
      <div className="dashboard">
        <canvas ref={canvasRef} className="particle-canvas"></canvas>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">
            <Activity size={48} className="pulse-animation" />
            <h2>Loading {modelNames[selectedModel]} Dashboard...</h2>
            <p>Processing your test execution data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <canvas ref={canvasRef} className="particle-canvas"></canvas>
      
      <div className="dashboard-header">
        <div className="back-button" onClick={onBackToProjects}>
          <ArrowLeft size={20} />
          <span>Back to Projects</span>
        </div>
        
        <div className="dashboard-icon floating-animation">
          <Activity size={64} color="white" />
        </div>
        <h1 className="dashboard-title gradient-text">
          {modelNames[selectedModel]} Dashboard
        </h1>
        <p className="dashboard-subtitle">
          Real-time Testing Metrics & Analytics
        </p>
        <div className="live-indicator">
          <div className="live-dot"></div>
          <span>Live • {currentTime.toLocaleTimeString()}</span>
        </div>
        
        <div className="upload-section">
          <label className="upload-button glass-button">
            <Upload size={20} />
            Upload Different File
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="error glass-card">
          <XCircle size={24} />
          <p>{error}</p>
        </div>
      )}

      {!csvFound && selectedModel === 'model-i' && (
        <div className="info glass-card" style={{ 
          background: 'rgba(59, 130, 246, 0.1)', 
          border: '1px solid rgba(59, 130, 246, 0.3)', 
          color: '#93c5fd',
          marginBottom: '30px'
        }}>
          <AlertCircle size={24} />
          <p>CSV file not found. Using default demo data. Place your CSV file at <code>public/dashboard.csv</code> to load real data.</p>
        </div>
      )}

      {/* Enhanced Metrics Grid with Yet to validate */}
      <div className="metrics-grid">
        <MetricCard
          title="TOTAL TEST CASES"
          value={currentData.totalCases}
          icon={Target}
          iconColor="icon-purple"
          gradient="gradient-purple"
          trend={2.3}
        />
        
        <MetricCard
          title="TOTAL EXECUTED"
          value={currentData.totalExecuted}
          subtitle={`${currentData.executionRate.toFixed(2)}% Execution Rate`}
          icon={Zap}
          iconColor="icon-blue"
          gradient="gradient-blue"
          trend={5.7}
        />
        
        <MetricCard
          title="TOTAL PASSED"
          value={currentData.totalPassed}
          subtitle={`${currentData.passRate.toFixed(2)}% Pass Rate`}
          icon={Award}
          iconColor="icon-green"
          gradient="gradient-green"
          trend={1.2}
        />
        
        <MetricCard
          title="TOTAL FAILED"
          value={currentData.totalFailed}
          subtitle={`${((currentData.totalFailed / currentData.totalExecuted) * 100 || 0).toFixed(2)}% Failure Rate`}
          icon={AlertTriangle}
          iconColor="icon-red"
          gradient="gradient-red"
          trend={-0.8}
        />
        
        <MetricCard
          title="IN PROGRESS"
          value={currentData.inProgress}
          icon={Clock}
          iconColor="icon-orange"
          gradient="gradient-orange"
        />

        <MetricCard
          title="NEED TO RETEST"
          value={currentData.needToRetest}
          subtitle={`${currentData.retestRate.toFixed(2)}% Retest Rate`}
          icon={RefreshCw}
          iconColor="icon-indigo"
          gradient="gradient-indigo"
          trend={-1.4}
        />

        {/* New Yet to Validate Card */}
        <MetricCard
          title="YET TO VALIDATE"
          value={currentData.yetToValidate}
          subtitle={`${currentData.validationRate.toFixed(2)}% Validation Rate`}
          icon={AlertCircle}
          iconColor="icon-amber"
          gradient="gradient-amber"
          trend={0.8}
        />
      </div>

      {/* Updated Charts Section */}
      <div className="charts-section">
        <div className="chart-card glass-card">
          <h3 className="chart-title">Test Results Summary</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={barChartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="name" 
                stroke="rgba(255,255,255,0.8)"
                fontSize={12}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.8)"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '12px',
                  color: '#333333',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                  backdropFilter: 'blur(10px)'
                }}
                itemStyle={{
                  color: '#333333'
                }}
                labelStyle={{
                  color: '#333333',
                  fontWeight: 'bold'
                }}
              />
              <Bar 
                dataKey="value" 
                radius={[8, 8, 0, 0]}
              >
                {barChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card glass-card">
          <h3 className="chart-title">Test Distribution</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={140}
                dataKey="value"
                animationBegin={0}
                animationDuration={2000}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '12px',
                  color: '#333333',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                  backdropFilter: 'blur(10px)'
                }}
                itemStyle={{
                  color: '#333333'
                }}
                labelStyle={{
                  color: '#333333',
                  fontWeight: 'bold'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="summary-section">
        <div className="summary-card glass-card">
          <h4>Performance Insights</h4>
          <div className="insights-grid">
            <div className="insight">
              <div className="insight-icon">🎯</div>
              <div className="insight-text">
                <strong>Execution Rate</strong>
                <span>{currentData.executionRate.toFixed(1)}%</span>
              </div>
            </div>
            <div className="insight">
              <div className="insight-icon">✅</div>
              <div className="insight-text">
                <strong>Success Rate</strong>
                <span>{currentData.passRate.toFixed(1)}%</span>
              </div>
            </div>
            <div className="insight">
              <div className="insight-icon">🔄</div>
              <div className="insight-text">
                <strong>Retest Rate</strong>
                <span>{currentData.retestRate.toFixed(1)}%</span>
              </div>
            </div>
            <div className="insight">
              <div className="insight-icon">📋</div>
              <div className="insight-text">
                <strong>Validation Rate</strong>
                <span>{currentData.validationRate.toFixed(1)}%</span>
              </div>
            </div>
            <div className="insight">
              <div className="insight-icon">⚡</div>
              <div className="insight-text">
                <strong>Efficiency</strong>
                <span>Excellent</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  const [currentView, setCurrentView] = useState('projects');
  const [selectedModel, setSelectedModel] = useState(null);

  const handleSelectModel = (modelId) => {
    setSelectedModel(modelId);
    setCurrentView('dashboard');
  };

  const handleBackToProjects = () => {
    setCurrentView('projects');
    setSelectedModel(null);
  };

  return (
    <div className="app">
      {currentView === 'projects' ? (
        <ProjectsPage onSelectModel={handleSelectModel} />
      ) : (
        <Dashboard 
          selectedModel={selectedModel} 
          onBackToProjects={handleBackToProjects} 
        />
      )}
    </div>
  );
};

export default App;

