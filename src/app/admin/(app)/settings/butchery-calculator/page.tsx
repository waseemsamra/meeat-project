
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Save, Download, Printer, Target, DollarSign, 
  Package, Activity, Trash2, Eye,
  RotateCcw, TrendingUp, FileText, ShoppingBag, Loader2, Calculator, Map, Maximize2, Minimize2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import printJS from 'print-js';
import { useSettings } from '@/hooks/useSettings';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Currency } from '@/lib/types';
import { ReportHeader } from '../../reporting/ReportHeader';


const lambCuts = [
    { id: 1, name: "Whole Leg (bone-in)", type: "premium", defaultPercent: 25, pricePerKg: 24, editable: false },
    { id: 2, name: "Leg Roast (sirloin end)", type: "premium", defaultPercent: 6, pricePerKg: 26, editable: false },
    { id: 3, name: "Leg Roast (shank end)", type: "premium", defaultPercent: 6, pricePerKg: 26, editable: false },
    { id: 4, name: "Loin Chops", type: "premium", defaultPercent: 8, pricePerKg: 32, editable: false },
    { id: 5, name: "Rack of Lamb", type: "premium", defaultPercent: 6, pricePerKg: 36, editable: false },
    { id: 6, name: "Rib Chops", type: "premium", defaultPercent: 7, pricePerKg: 34, editable: false },
    { id: 7, name: "Shoulder Roast (bone-in)", type: "middle", defaultPercent: 10, pricePerKg: 18, editable: false },
    { id: 8, name: "Boneless Shoulder Roast", type: "middle", defaultPercent: 6, pricePerKg: 22, editable: false },
    { id: 9, name: "Stewing Cubes", type: "value", defaultPercent: 8, pricePerKg: 16, editable: false },
    { id: 10, name: "Ground Lamb / Mince", type: "value", defaultPercent: 12, pricePerKg: 14, editable: false },
    { id: 11, name: "Shanks (foreshank)", type: "value", defaultPercent: 5, pricePerKg: 12, editable: false },
    { id: 12, name: "Breast", type: "value", defaultPercent: 4, pricePerKg: 10, editable: false },
    { id: 13, name: "Neck Pieces", type: "value", defaultPercent: 3, pricePerKg: 8, editable: false },
];

const beefCuts = [
    { id: 1, name: "Brisket", type: "premium", defaultPercent: 6, pricePerKg: 18, editable: false },
    { id: 2, name: "Chuck Roast", type: "middle", defaultPercent: 10, pricePerKg: 15, editable: false },
    { id: 3, name: "Ribeye Steak", type: "premium", defaultPercent: 8, pricePerKg: 45, editable: false },
    { id: 4, name: "Short Ribs", type: "premium", defaultPercent: 5, pricePerKg: 25, editable: false },
    { id: 5, name: "Sirloin Steak", type: "premium", defaultPercent: 9, pricePerKg: 30, editable: false },
    { id: 6, name: "Tenderloin (Filet Mignon)", type: "premium", defaultPercent: 3, pricePerKg: 60, editable: false },
    { id: 7, name: "Round Steak", type: "value", defaultPercent: 12, pricePerKg: 12, editable: false },
    { id: 8, name: "Flank Steak", type: "middle", defaultPercent: 2, pricePerKg: 20, editable: false },
    { id: 9, name: "Shank (Cross-cut)", type: "value", defaultPercent: 4, pricePerKg: 10, editable: false },
    { id: 10, name: "Ground Beef", type: "value", defaultPercent: 20, pricePerKg: 9, editable: false },
    { id: 11, name: "Stew Meat", type: "value", defaultPercent: 10, pricePerKg: 11, editable: false },
    { id: 12, name: "Oxtail", type: "value", defaultPercent: 1, pricePerKg: 14, editable: false },
];

const muttonCuts = lambCuts.map(cut => ({
    ...cut,
    pricePerKg: parseFloat((cut.pricePerKg * 0.9).toFixed(2)) // Mutton is often priced slightly lower than lamb
}));


const cutsData = {
    Lamb: lambCuts,
    Beef: beefCuts,
    Mutton: muttonCuts
};

type CarcassType = keyof typeof cutsData;

const getTypeLabel = (type: string) => {
    switch (type) {
      case 'premium': return 'Premium';
      case 'middle': return 'Middle';
      case 'value': return 'Value';
      default: return 'Other';
    }
};

const CarcassDiagram = ({ hoveredCut, onCutHover, cuts, currencySymbol, carcassType }: any) => {
    const cutSections = {
      Lamb: {
        'whole-leg': ['Whole Leg (bone-in)', 'Leg Roast (sirloin end)', 'Leg Roast (shank end)'],
        'rack': ['Rack of Lamb', 'Rib Chops'],
        'loin': ['Loin Chops'],
        'shoulder': ['Shoulder Roast (bone-in)', 'Boneless Shoulder Roast', 'Stewing Cubes'],
        'shank': ['Shanks (foreshank)', 'Neck Pieces'],
        'breast': ['Breast'],
        'trim': ['Ground Lamb / Mince']
      },
      Mutton: {
        'whole-leg': ['Whole Leg (bone-in)', 'Leg Roast (sirloin end)', 'Leg Roast (shank end)'],
        'rack': ['Rack of Lamb', 'Rib Chops'],
        'loin': ['Loin Chops'],
        'shoulder': ['Shoulder Roast (bone-in)', 'Boneless Shoulder Roast', 'Stewing Cubes'],
        'shank': ['Shanks (foreshank)', 'Neck Pieces'],
        'breast': ['Breast'],
        'trim': ['Ground Lamb / Mince']
      },
      Beef: {
        'chuck': ['Chuck Roast', 'Stew Meat'],
        'rib': ['Ribeye Steak', 'Short Ribs'],
        'loin': ['Sirloin Steak', 'Tenderloin (Filet Mignon)'],
        'round': ['Round Steak'],
        'brisket': ['Brisket'],
        'plate/flank': ['Flank Steak'],
        'shank': ['Shank (Cross-cut)'],
        'trim': ['Ground Beef', 'Oxtail']
      }
    };
  
    const getCutColor = (section: string) => {
      const cutNames = cutSections[carcassType][section];
      if (!cutNames) return '#e0e0e0';
      const matchingCuts = cuts.filter((c: any) => cutNames.includes(c.name));
      if (matchingCuts.length === 0) return '#e0e0e0';
      
      const totalValue = matchingCuts.reduce((sum: number, cut: any) => sum + (cut.weight * cut.pricePerKg), 0);
      const totalWeight = matchingCuts.reduce((sum: number, cut: any) => sum + cut.weight, 0);
      const avgPricePerKg = totalWeight > 0 ? totalValue / totalWeight : 0;
      
      if (avgPricePerKg > 25) return '#4caf50';
      if (avgPricePerKg > 15) return '#2196f3';
      return '#ff9800';
    };
  
    const isHovered = (section: string) => {
      if (!hoveredCut) return false;
      const cutNames = cutSections[carcassType][section];
      return cutNames ? cutNames.includes(hoveredCut) : false;
    };
  
    const getSectionValue = (section: string) => {
      const cutNames = cutSections[carcassType][section];
      if (!cutNames) return 0;
      const matchingCuts = cuts.filter((c: any) => cutNames.includes(c.name));
      const totalValue = matchingCuts.reduce((sum: number, cut: any) => sum + (cut.weight * cut.pricePerKg), 0);
      return totalValue;
    };
    
    const DiagramLayout = carcassType === 'Beef' ? (
        <div className="relative w-[350px] h-[220px] bg-gradient-to-br from-white to-gray-100 rounded-lg border-2 border-gray-300 shadow-inner">
            {Object.keys(cutSections.Beef).map((sectionKey) => {
                const sectionName = sectionKey as keyof typeof cutSections['Beef'];
                return (
                    <div 
                        key={sectionName}
                        className={`absolute border-2 border-white/80 shadow-md transition-all duration-300 ease-in-out cursor-pointer flex flex-col items-center justify-center text-white font-bold z-10 group
                                    ${isHovered(sectionName) ? 'scale-105 shadow-lg z-20 border-white' : ''}
                                    ${sectionKey === 'chuck' ? 'top-[5%] left-[5%] w-[100px] h-[80px] rounded-md' : ''}
                                    ${sectionKey === 'rib' ? 'top-[5%] left-[35%] w-[80px] h-[80px] rounded-md' : ''}
                                    ${sectionKey === 'loin' ? 'top-[5%] left-[60%] w-[110px] h-[80px] rounded-md' : ''}
                                    ${sectionKey === 'round' ? 'top-[5%] right-[5%] w-[90px] h-[150px] rounded-md' : ''}
                                    ${sectionKey === 'brisket' ? 'bottom-[5%] left-[5%] w-[120px] h-[60px] rounded-md' : ''}
                                    ${sectionKey === 'plate/flank' ? 'bottom-[5%] left-[40%] w-[120px] h-[60px] rounded-md' : ''}
                                    ${sectionKey === 'shank' ? 'bottom-[5%] right-[30%] w-[80px] h-[60px] rounded-md' : ''}
                                    `}
                        style={{ backgroundColor: getCutColor(sectionName) }}
                        onMouseEnter={() => onCutHover(cutSections.Beef[sectionName][0])}
                        onMouseLeave={() => onCutHover(null)}
                    >
                         <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black/80 text-white px-3 py-1 rounded-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            {getTypeLabel(cuts.find((c:any) => c.name === cutSections.Beef[sectionName][0])?.type || '')} Cuts
                          </div>
                          <div className="bg-black/70 px-3 py-1 rounded-md text-sm mb-1 text-center capitalize">{sectionName.replace('-', ' ')}</div>
                          <div className="bg-white/90 text-gray-800 px-2 py-1 rounded-md text-xs font-bold">{currencySymbol}{getSectionValue(sectionName).toFixed(0)}</div>
                    </div>
                )
            })}
        </div>
    ) : (
        <div className="relative w-[250px] h-[350px] bg-gradient-to-br from-white to-gray-100 rounded-[120px/180px] border-2 border-gray-300 shadow-inner">
            {Object.keys(cutSections[carcassType]).map((sectionKey) => {
                const sectionName = sectionKey as keyof typeof cutSections['Lamb'];
                return (
                    <div 
                      key={sectionName}
                      className={`absolute border-2 border-white/80 shadow-md transition-all duration-300 ease-in-out cursor-pointer flex flex-col items-center justify-center text-white font-bold z-10 group
                                  ${isHovered(sectionName) ? 'scale-105 shadow-lg z-20 border-white' : ''}
                                  ${sectionKey === 'whole-leg' ? 'top-[40%] left-[10%] w-[90px] h-[140px] rounded-[45px]' : ''}
                                  ${sectionKey === 'rack' ? 'top-[15%] left-[35%] w-[70px] h-[100px] rounded-[35px]' : ''}
                                  ${sectionKey === 'loin' ? 'top-[20%] left-[50%] w-[60px] h-[90px] rounded-[30px]' : ''}
                                  ${sectionKey === 'shoulder' ? 'top-[10%] right-[10%] w-[90px] h-[120px] rounded-[45px]' : ''}
                                  ${sectionKey === 'shank' ? 'bottom-[15%] left-[20%] w-[80px] h-[110px] rounded-[40px]' : ''}
                                  ${sectionKey === 'breast' ? 'bottom-[5%] left-1/2 -translate-x-1/2 w-[120px] h-[70px] rounded-t-[60px] rounded-b-none' : ''}
                                  ${sectionKey === 'trim' ? 'top-[60%] right-[8%] w-[70px] h-[70px] rounded-full' : ''}
                                  `}
                      style={{ backgroundColor: getCutColor(sectionName) }}
                      onMouseEnter={() => onCutHover(cutSections[carcassType][sectionName][0])}
                      onMouseLeave={() => onCutHover(null)}
                    >
                      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black/80 text-white px-3 py-1 rounded-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {getTypeLabel(cuts.find((c:any) => c.name === cutSections[carcassType][sectionName][0])?.type || '')} Cuts
                      </div>
                      <div className="bg-black/70 px-3 py-1 rounded-md text-sm mb-1 text-center capitalize">{sectionName.replace('-', ' ')}</div>
                      <div className="bg-white/90 text-gray-800 px-2 py-1 rounded-md text-xs font-bold">{currencySymbol}{getSectionValue(sectionName).toFixed(0)}</div>
                    </div>
                );
            })}
        </div>
    );
  
    return (
      <Card className="shadow-sm border bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <Map size={20} />
            Interactive Carcass Diagram
          </CardTitle>
          <CardDescription>Hover over cuts in the table or diagram to highlight them</CardDescription>
        </CardHeader>
        
        <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 items-start">
                <div className="bg-gradient-to-br from-gray-50 to-gray-200 p-10 rounded-md min-h-[400px] flex items-center justify-center border">
                    {DiagramLayout}
                </div>
            
                <div className="border rounded-md p-4 bg-white">
                    <h4 className="font-semibold text-gray-800 mb-3 pb-2 border-b">Price Tier Legend</h4>
                    <div className="flex flex-col gap-3">
                    {[
                        { color: '#4caf50', title: 'Premium', desc: `Over ${currencySymbol}25/kg` },
                        { color: '#2196f3', title: 'Mid-range', desc: `${currencySymbol}15-25/kg` },
                        { color: '#ff9800', title: 'Value', desc: `Under ${currencySymbol}15/kg` },
                        { color: '#e0e0e0', title: 'Not Calculated', desc: 'No cuts in section' },
                    ].map(item => (
                        <div key={item.title} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50">
                        <div className="w-7 h-7 rounded-md border-2 border-black/10 shrink-0" style={{ backgroundColor: item.color }}></div>
                        <div>
                            <div className="font-semibold text-sm text-gray-800">{item.title}</div>
                            <div className="text-xs text-gray-500">{item.desc}</div>
                        </div>
                        </div>
                    ))}
                    </div>
                    <div className="mt-6 p-4 bg-gray-50 rounded-md border-l-4 border-primary">
                        <h5 className="font-semibold text-sm mb-2">How to Use:</h5>
                        <ul className="list-none p-0 m-0 space-y-1">
                            <li className="text-xs text-gray-600 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-primary">Hover on diagram to see cuts.</li>
                            <li className="text-xs text-gray-600 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-primary">Hover on table to see diagram parts.</li>
                            <li className="text-xs text-gray-600 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-primary">Colors show average price tier.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>
    );
};

const ScenarioManager = ({ scenarios, onSaveScenario, onLoadScenario, onDeleteScenario, currentScenarioName }: any) => {
  const [newScenarioName, setNewScenarioName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSave = () => {
    if (newScenarioName.trim()) {
      onSaveScenario(newScenarioName.trim());
      setNewScenarioName('');
      setIsAdding(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between bg-zinc-100/50 dark:bg-zinc-800/20 p-4">
        <CardTitle className="text-base flex items-center gap-2 m-0"><Save size={16} /> Saved Scenarios</CardTitle>
        <Button size="sm" onClick={() => setIsAdding(true)}>+ New</Button>
      </CardHeader>
      <CardContent className="p-4">
        {isAdding && (
          <div className="p-4 mb-4 border rounded-lg bg-background">
            <Input
              type="text"
              value={newScenarioName}
              onChange={(e) => setNewScenarioName(e.target.value)}
              placeholder="Enter scenario name..."
              autoFocus
              className="mb-2"
              onKeyPress={(e) => e.key === 'Enter' && handleSave()}
            />
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm" className="w-full">Save</Button>
              <Button onClick={() => { setIsAdding(false); setNewScenarioName(''); }} size="sm" variant="outline" className="w-full">Cancel</Button>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {scenarios.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground p-4">No saved scenarios yet.</p>
          ) : (
            scenarios.map((scenario: any, index: number) => (
              <div key={index} className={`flex items-center justify-between p-3 rounded-md transition-colors ${scenario.name === currentScenarioName ? 'bg-primary/10 border border-primary' : 'bg-zinc-50 dark:bg-zinc-800/30'}`}>
                <div>
                  <p className="font-semibold text-sm">{scenario.name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(scenario.date).toLocaleDateString()} | {scenario.carcassWeight}kg</p>
                </div>
                <div className="flex gap-1">
                  <Button onClick={() => onLoadScenario(scenario)} size="icon" variant="ghost" className="h-8 w-8" title="Load Scenario"><Eye size={16} /></Button>
                  <Button onClick={() => onDeleteScenario(scenario.name)} size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Delete Scenario"><Trash2 size={16} /></Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};


const ProfitSolver = ({ cuts, totalCost, onApplySolution, currency }: any) => {
  const [targetMargin, setTargetMargin] = useState(35);
  const [solvedPrices, setSolvedPrices] = useState<any[]>([]);
  const [isSolving, setIsSolving] = useState(false);

  const calculateSolution = () => {
    setIsSolving(true);
    setTimeout(() => {
        const requiredRevenue = totalCost / (1 - targetMargin / 100);
        const currentRevenue = cuts.reduce((sum: number, cut: any) => sum + cut.weight * cut.pricePerKg, 0);
        const revenueIncreaseNeeded = requiredRevenue - currentRevenue;

        const weights = { premium: 3, middle: 2, value: 1 };
        
        const totalWeightedRevenue = cuts.reduce((sum: number, cut: any) => {
            const weight = weights[cut.type as keyof typeof weights] || 1;
            return sum + (cut.pricePerKg * cut.weight * weight);
        }, 0);

        if (totalWeightedRevenue === 0) {
            setIsSolving(false);
            return;
        }

        const solution = cuts.map((cut: any) => {
            const weight = weights[cut.type as keyof typeof weights] || 1;
            const cutRevenueShare = (cut.pricePerKg * cut.weight * weight) / totalWeightedRevenue;
            
            const increaseForCut = revenueIncreaseNeeded * cutRevenueShare;

            const newPricePerKg = cut.weight > 0 ? (cut.weight * cut.pricePerKg + increaseForCut) / cut.weight : cut.pricePerKg;
            
            return {
                ...cut,
                suggestedPrice: parseFloat(newPricePerKg.toFixed(2))
            };
        });
        
        setSolvedPrices(solution);
        setIsSolving(false);
    }, 500);
  };

  const applySolution = () => {
    if (solvedPrices.length > 0) {
      onApplySolution(solvedPrices);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Target size={16} /> Profit Margin Solver</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Target Profit Margin: <span className="font-bold text-primary">{targetMargin}%</span></Label>
            <Input 
              type="range" 
              min="0" 
              max="100" 
              value={targetMargin} 
              onChange={(e) => setTargetMargin(parseInt(e.target.value))}
            />
          </div>
          <Button onClick={calculateSolution} className="w-full" disabled={isSolving}>
            {isSolving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
            Calculate Price Adjustments
          </Button>
        </div>

        {solvedPrices.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold mb-2">Suggested Price Adjustments</h4>
            <div className="max-h-60 overflow-y-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cut</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>Suggested</TableHead>
                    <TableHead>Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {solvedPrices.map((item, index) => {
                    const change = item.pricePerKg > 0 ? ((item.suggestedPrice - item.pricePerKg) / item.pricePerKg * 100) : 0;
                    return (
                      <TableRow key={index}>
                        <TableCell className="text-xs">{item.name}</TableCell>
                        <TableCell className="text-xs">{currency}{item.pricePerKg.toFixed(2)}</TableCell>
                        <TableCell className="font-bold text-primary text-xs">{currency}{item.suggestedPrice.toFixed(2)}</TableCell>
                        <TableCell className={`text-xs font-semibold ${change >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                          {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <Button onClick={applySolution} className="w-full mt-4">Apply All Suggested Prices</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};


export default function ButcheryCalculatorPage() {
  const [carcassType, setCarcassType] = useState<CarcassType>('Lamb');
  const [carcassWeight, setCarcassWeight] = useState(20);
  const [costDetails, setCostDetails] = useState({ carcassCost: 100, laborCost: 20, packagingCost: 8, overheadCost: 12, otherCosts: 5 });
  const [cuts, setCuts] = useState(cutsData[carcassType].map(c => ({...c, weight: 0})));
  const [hoveredCut, setHoveredCut] = useState(null);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [currentScenario, setCurrentScenario] = useState('Default');
  const [showDiagram, setShowDiagram] = useState(true);
  const [showSolver, setShowSolver] = useState(false);
  const [expandedView, setExpandedView] = useState(false);
  const { toast } = useToast();
  
  const { defaultCurrency, isLoading: isLoadingSettings } = useSettings();
  const firestore = useFirestore();

  const currenciesQuery = useMemo(() => firestore ? collection(firestore, 'currencies') : null, [firestore]);
  const { data: currencies, isLoading: isLoadingCurrencies } = useCollection<Currency>(currenciesQuery);
  
  const [currencySymbol, setCurrencySymbol] = useState(defaultCurrency?.symbol || '$');
  
  useEffect(() => {
    if (defaultCurrency) {
      setCurrencySymbol(defaultCurrency.symbol);
    }
  }, [defaultCurrency]);

  useEffect(() => {
    setCuts(cutsData[carcassType].map(c => ({...c, weight: 0})));
    resetToDefaults();
  }, [carcassType]);

  useEffect(() => {
    try {
      const savedScenarios = localStorage.getItem('butcheryScenarios');
      if (savedScenarios) {
        setScenarios(JSON.parse(savedScenarios));
      }
    } catch (e) {
      console.error("Could not parse scenarios from localStorage", e);
    }
  }, []);
  
  const totalCost = useMemo(() => Object.values(costDetails).reduce((sum, val) => sum + parseFloat(String(val || 0)), 0), [costDetails]);
  
  const calculatedData = useMemo(() => {
    const totalDefaultPercent = cuts.reduce((sum, cut) => sum + cut.defaultPercent, 0);
    const scaleFactor = 95 / totalDefaultPercent;
    
    const updatedCuts = cuts.map(cut => ({
      ...cut,
      weight: parseFloat(((carcassWeight * cut.defaultPercent * scaleFactor) / 100).toFixed(2))
    }));

    const totalSaleableWeight = updatedCuts.reduce((sum, cut) => sum + cut.weight, 0);
    const totalRevenue = updatedCuts.reduce((sum, cut) => sum + (cut.weight * cut.pricePerKg), 0);
    const grossProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const wasteWeight = carcassWeight - totalSaleableWeight;
    const yieldPercentage = carcassWeight > 0 ? (totalSaleableWeight / carcassWeight) * 100 : 0;

    return { cuts: updatedCuts, totalSaleableWeight, totalRevenue, totalCost, grossProfit, profitMargin, wasteWeight, yieldPercentage };
  }, [carcassWeight, cuts, totalCost]);

  const handlePriceChange = (id: number, newPrice: string) => setCuts(cuts.map(cut => cut.id === id ? { ...cut, pricePerKg: parseFloat(newPrice) || 0 } : cut));
  const handleWeightOverride = (id: number, newWeight: string) => setCuts(cuts.map(cut => cut.id === id ? { ...cut, weight: parseFloat(newWeight) || 0 } : cut));
  const handleCostDetailChange = (field: keyof typeof costDetails, value: string) => setCostDetails(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));

  const saveScenario = (name: string) => {
    const scenario = { name, date: new Date().toISOString(), carcassType, carcassWeight, costDetails, cuts: cuts.map(c => ({ name: c.name, pricePerKg: c.pricePerKg, weight: c.weight })) };
    const updatedScenarios = [...scenarios.filter(s => s.name !== name), scenario];
    setScenarios(updatedScenarios);
    setCurrentScenario(name);
    localStorage.setItem('butcheryScenarios', JSON.stringify(updatedScenarios));
    toast({ title: "Scenario Saved", description: `Scenario "${name}" has been saved.`});
  };

  const loadScenario = (scenario: any) => {
    if (scenario.carcassType) {
        setCarcassType(scenario.carcassType);
    }
    setCarcassWeight(scenario.carcassWeight);
    setCostDetails(scenario.costDetails);
    
    // Make sure we are loading cuts for the correct carcass type
    const baseCuts = cutsData[scenario.carcassType as CarcassType] || cutsData['Lamb'];

    setCuts(baseCuts.map(cut => {
      const savedCut = scenario.cuts.find((c: any) => c.name === cut.name);
      return savedCut ? { ...cut, pricePerKg: savedCut.pricePerKg, weight: savedCut.weight } : cut;
    }));
    setCurrentScenario(scenario.name);
    toast({ title: "Scenario Loaded", description: `Scenario "${scenario.name}" has been loaded.`});
  };

  const deleteScenario = (name: string) => {
    const updatedScenarios = scenarios.filter(s => s.name !== name);
    setScenarios(updatedScenarios);
    localStorage.setItem('butcheryScenarios', JSON.stringify(updatedScenarios));
    if (currentScenario === name) {
      setCurrentScenario('Default');
    }
    toast({ title: "Scenario Deleted", description: `Scenario "${name}" has been deleted.`});
  };

  const applyPriceSolution = (solvedPrices: any[]) => {
    const updatedCuts = cuts.map(cut => {
      const solvedCut = solvedPrices.find(s => s.id === cut.id);
      return solvedCut ? { ...cut, pricePerKg: solvedCut.suggestedPrice } : cut;
    });
    setCuts(updatedCuts);
    toast({ title: "Prices Updated", description: "Suggested prices from the solver have been applied." });
  };
  
  const getProfitMarginColor = (margin: number) => {
    if (margin >= 20) return 'text-green-600 dark:text-green-400';
    if (margin >= 0) return 'text-amber-600 dark:text-amber-400';
    return 'text-destructive';
  };

  const printReport = () => {
     printJS({
        printable: 'printable-report',
        type: 'html',
        scanStyles: true,
        documentTitle: `Enhanced Meat Butchery Analysis - ${currentScenario}`,
        targetStyles: ['*']
    });
  };

  const exportToCSV = () => {
    const headers = ['Cut Name', 'Weight (kg)', `Price/kg (${currencySymbol})`, `Total Value (${currencySymbol})`, 'Type'];
    const data = calculatedData.cuts.map(cut => [
      `"${cut.name.replace(/"/g, '""')}"`,
      cut.weight.toFixed(2),
      cut.pricePerKg.toFixed(2),
      (cut.weight * cut.pricePerKg).toFixed(2),
      cut.type
    ]);
    
    const csvContent = [
      headers.join(','),
      ...data.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `butchery_analysis_${currentScenario.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
const PrintableReportComponent = React.forwardRef<HTMLDivElement>((props, ref) => (
    <div id="printable-report" className="p-8 bg-white text-black font-sans text-sm" ref={ref}>
       <div className="ml-8">
            <ReportHeader />
            <h2 className="text-2xl font-semibold mt-8 mb-4">Enhanced Meat Butchery Analysis Report: {currentScenario}</h2>
            
            <div className="flex flex-row gap-8 mb-6">
                <div className="flex-1 border p-4 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">Financial Summary</h3>
                    <div className="space-y-1">
                        <p><strong>Total Cost:</strong> {currencySymbol}{calculatedData.totalCost.toFixed(2)}</p>
                        <p><strong>Total Revenue:</strong> {currencySymbol}{calculatedData.totalRevenue.toFixed(2)}</p>
                        <p><strong>Gross Profit:</strong> <span className={calculatedData.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>{currencySymbol}{calculatedData.grossProfit.toFixed(2)}</span></p>
                        <p><strong>Profit Margin:</strong> <span className={getProfitMarginColor(calculatedData.profitMargin)}>{calculatedData.profitMargin.toFixed(1)}%</span></p>
                    </div>
                </div>
                 <div className="flex-1 border p-4 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">Weight Summary</h3>
                    <div className="space-y-1">
                        <p><strong>Carcass Weight:</strong> {carcassWeight.toFixed(1)} kg</p>
                        <p><strong>Saleable Weight:</strong> {calculatedData.totalSaleableWeight.toFixed(1)} kg</p>
                        <p><strong>Waste/Trim:</strong> {calculatedData.wasteWeight.toFixed(1)} kg</p>
                        <p><strong>Yield:</strong> {calculatedData.yieldPercentage.toFixed(1)}%</p>
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-xl font-semibold mb-4">Cut Breakdown</h3>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-zinc-100">
                      <th className="border p-2 text-left">Cut Name</th>
                      <th className="border p-2 text-left">Weight (kg)</th>
                      <th className="border p-2 text-left">Price/kg ({currencySymbol})</th>
                      <th className="border p-2 text-left">Total Value ({currencySymbol})</th>
                      <th className="border p-2 text-left">% of Carcass</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculatedData.cuts.map(cut => (
                        <tr key={cut.id}>
                            <td className="border p-2">{cut.name}</td>
                            <td className="border p-2">{cut.weight.toFixed(2)}</td>
                            <td className="border p-2">{cut.pricePerKg.toFixed(2)}</td>
                            <td className="border p-2">{(cut.weight * cut.pricePerKg).toFixed(2)}</td>
                            <td className="border p-2">{carcassWeight > 0 ? `${((cut.weight / carcassWeight) * 100).toFixed(1)}%` : '0.0%'}</td>
                        </tr>
                    ))}
                  </tbody>
                </table>
            </div>

            <div>
                <h3 className="text-xl font-semibold mb-4">Revenue Distribution by Cut Type</h3>
                {['premium', 'middle', 'value'].map(type => {
                    const typeCuts = calculatedData.cuts.filter(cut => cut.type === type);
                    const typeRevenue = typeCuts.reduce((sum, cut) => sum + (cut.weight * cut.pricePerKg), 0);
                    const percentage = calculatedData.totalRevenue > 0 ? (typeRevenue / calculatedData.totalRevenue) * 100 : 0;
                    return (
                        <div key={type} className="mb-4">
                            <div className="flex justify-between mb-1"><span className="font-medium">{getTypeLabel(type)}</span><span>{currencySymbol}{typeRevenue.toFixed(2)} ({percentage.toFixed(1)}%)</span></div>
                            <div className="h-4 bg-zinc-200 rounded-full overflow-hidden">
                                <div className="h-full" style={{ width: `${percentage}%`, backgroundColor: type==='premium' ? '#3b82f6' : type==='middle' ? '#a855f7' : '#22c55e' }}></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  ));
PrintableReportComponent.displayName = 'PrintableReportComponent';

  const resetToDefaults = () => {
    setCarcassWeight(20);
    setCostDetails({
      carcassCost: 100,
      laborCost: 20,
      packagingCost: 8,
      overheadCost: 12,
      otherCosts: 5
    });
    setCuts(cutsData[carcassType].map(c => ({...c, weight: 0})));
    setCurrentScenario('Default');
    toast({ title: "Reset to Defaults", description: "All calculator inputs have been reset to their default values." });
  };


  return (
    <div className={`space-y-8 ${expandedView ? 'app expanded' : 'app'}`}>
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold font-headline flex items-center gap-3"><ShoppingBag size={32}/> Enhanced Butchery Calculator</h1>
            <p className="text-muted-foreground">Professional tool for butchers with advanced pricing and profit analysis.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setExpandedView(!expandedView)}>
                {expandedView ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                <span className="ml-2 hidden lg:inline">{expandedView ? "Compact View" : "Expand View"}</span>
            </Button>
            <Button variant="outline" onClick={printReport}><Printer size={18} className="mr-2" /> Print Report</Button>
            <Button variant="outline" onClick={exportToCSV}><Download size={18} className="mr-2"/> Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">
        <aside className="space-y-6 lg:sticky top-6">
            <ScenarioManager scenarios={scenarios} onSaveScenario={saveScenario} onLoadScenario={loadScenario} onDeleteScenario={deleteScenario} currentScenarioName={currentScenario} />
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2 m-0"><Activity size={16}/> Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                     <div className="flex items-center justify-between">
                        <Label htmlFor="show-diagram" className="text-sm font-medium">Show Carcass Diagram</Label>
                        <Switch id="show-diagram" checked={showDiagram} onCheckedChange={setShowDiagram}/>
                    </div>
                     <div className="flex items-center justify-between">
                        <Label htmlFor="show-solver" className="text-sm font-medium">Show Profit Solver</Label>
                        <Switch id="show-solver" checked={showSolver} onCheckedChange={setShowSolver} />
                    </div>
                </CardContent>
            </Card>
        </aside>

        <main className="space-y-8">
          <Card>
            <CardHeader><CardTitle>Input Parameters</CardTitle></CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="space-y-2">
                        <Label className="flex items-center gap-2"><ShoppingBag size={14}/>Carcass Type</Label>
                        <Select value={carcassType} onValueChange={(v) => setCarcassType(v as CarcassType)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Lamb">Lamb</SelectItem>
                                <SelectItem value="Mutton">Mutton</SelectItem>
                                <SelectItem value="Beef">Beef</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><RotateCcw size={14}/>Carcass Weight (kg)</Label>
                        <Input type="number" value={carcassWeight} onChange={(e) => setCarcassWeight(parseFloat(e.target.value) || 0)} min="1" step="0.5" />
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><DollarSign size={14}/>Currency</Label>
                         <Select value={currencySymbol} onValueChange={setCurrencySymbol} disabled={isLoadingSettings || isLoadingCurrencies}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {currencies?.map(c => <SelectItem key={c.id} value={c.symbol}>{c.name} ({c.symbol})</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <Separator />
                <div className="space-y-4">
                     <h3 className="text-lg font-semibold flex items-center gap-2"><TrendingUp size={16}/> Advanced Cost Breakdown</h3>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {(Object.keys(costDetails) as Array<keyof typeof costDetails>).map(key => (
                           <div key={key} className="space-y-1">
                                <Label className="text-xs text-muted-foreground">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</Label>
                                <Input type="number" value={costDetails[key]} onChange={(e) => handleCostDetailChange(key, e.target.value)} min="0" />
                           </div>
                        ))}
                     </div>
                     <div className="flex justify-end font-bold text-lg p-2 bg-muted rounded-md">
                        <div className="flex items-center gap-4">
                            <span>Total Cost:</span>
                            <span className="text-primary">{currencySymbol}{totalCost.toFixed(2)}</span>
                        </div>
                     </div>
                </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileText size={18}/>Financial Summary</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">Total Cost:</span><span className="font-bold">{currencySymbol}{totalCost.toFixed(2)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">Total Revenue:</span><span className="font-bold">{currencySymbol}{calculatedData.totalRevenue.toFixed(2)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">Gross Profit:</span><span className={`font-bold text-base ${calculatedData.grossProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>{currencySymbol}{calculatedData.grossProfit.toFixed(2)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">Profit Margin:</span><span className={`font-bold text-base ${getProfitMarginColor(calculatedData.profitMargin)}`}>{calculatedData.profitMargin.toFixed(1)}%</span></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Package size={18}/>Weight Summary</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Carcass Weight:</span><span className="font-bold">{carcassWeight.toFixed(1)} kg</span></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Saleable Weight:</span><span className="font-bold">{calculatedData.totalSaleableWeight.toFixed(1)} kg</span></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Waste/Trim:</span><span className="font-bold">{calculatedData.wasteWeight.toFixed(1)} kg</span></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Yield:</span><span className="font-bold">{calculatedData.yieldPercentage.toFixed(1)}%</span></div>
                </CardContent>
              </Card>
          </div>

          {showDiagram && (
            <CarcassDiagram
              hoveredCut={hoveredCut}
              onCutHover={setHoveredCut}
              cuts={calculatedData.cuts}
              currencySymbol={currencySymbol}
              carcassType={carcassType}
            />
          )}

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Cut Breakdown</CardTitle>
                             <div className="text-sm text-muted-foreground">
                                Current Scenario: <strong className="text-primary">{currentScenario}</strong>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Cut Name</TableHead><TableHead>Type</TableHead>
                                <TableHead>Weight (kg)</TableHead><TableHead>Price/kg ({currencySymbol})</TableHead>
                                <TableHead>Total Value ({currencySymbol})</TableHead><TableHead>% of Carcass</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                            {calculatedData.cuts.map(cut => (
                                <TableRow key={cut.id} onMouseEnter={() => setHoveredCut(cut.name)} onMouseLeave={() => setHoveredCut(null)} className={hoveredCut === cut.name ? 'bg-blue-100/50 dark:bg-blue-900/20' : ''}>
                                <TableCell className="font-medium">{cut.name}</TableCell>
                                <TableCell><Badge variant={cut.type === 'premium' ? 'default' : cut.type === 'middle' ? 'secondary' : 'outline'}>{getTypeLabel(cut.type)}</Badge></TableCell>
                                <TableCell><Input type="number" value={cut.weight} onChange={(e) => handleWeightOverride(cut.id, e.target.value)} className="w-24"/></TableCell>
                                <TableCell><Input type="number" value={cut.pricePerKg} onChange={(e) => handlePriceChange(cut.id, e.target.value)} className="w-24" /></TableCell>
                                <TableCell className="font-semibold">{currencySymbol}{(cut.weight * cut.pricePerKg).toFixed(2)}</TableCell>
                                <TableCell>{carcassWeight > 0 ? `${((cut.weight / carcassWeight) * 100).toFixed(1)}%` : '0.0%'}</TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                        </div>
                    </CardContent>
                </Card>
                
                {showSolver && <ProfitSolver cuts={calculatedData.cuts} totalCost={calculatedData.totalCost} onApplySolution={applyPriceSolution} currency={currencySymbol}/>}

                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp/> Revenue Distribution by Cut Type</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        {['premium', 'middle', 'value'].map(type => {
                            const typeCuts = calculatedData.cuts.filter(cut => cut.type === type);
                            const typeRevenue = typeCuts.reduce((sum, cut) => sum + (cut.weight * cut.pricePerKg), 0);
                            const percentage = calculatedData.totalRevenue > 0 ? (typeRevenue / calculatedData.totalRevenue) * 100 : 0;
                            return (
                                <div key={type}>
                                <div className="flex justify-between mb-1 text-sm"><span className="font-medium">{getTypeLabel(type)}</span><span>{currencySymbol}{typeRevenue.toFixed(2)} ({percentage.toFixed(1)}%)</span></div>
                                <Progress value={percentage} className="[&>*]:bg-primary" />
                                </div>
                            );
                            })}
                    </CardContent>
                </Card>
            </div>
        </main>
      </div>

      <div className="hidden">
        <PrintableReportComponent ref={useRef()} />
      </div>
    </div>
  );
}
