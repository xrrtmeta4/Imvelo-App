import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/hooks/useLanguage';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Leaf, Bug, FlaskConical, Mountain, Calendar, MapPin, Pill, ArrowRight, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface KnowledgeNode {
  id: string;
  node_type: string;
  name: string;
  aliases: any;
  properties: any;
  confidence_score: number;
  interaction_count: number;
}

interface KnowledgeEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  relationship: string;
  weight: number;
  reported_by_count: number;
  metadata: any;
}

const NODE_TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  crop: { icon: Leaf, color: 'text-green-600', bg: 'bg-green-100' },
  pest: { icon: Bug, color: 'text-red-600', bg: 'bg-red-100' },
  disease: { icon: Bug, color: 'text-orange-600', bg: 'bg-orange-100' },
  treatment: { icon: FlaskConical, color: 'text-purple-600', bg: 'bg-purple-100' },
  soil_type: { icon: Mountain, color: 'text-amber-700', bg: 'bg-amber-100' },
  season: { icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100' },
  region: { icon: MapPin, color: 'text-teal-600', bg: 'bg-teal-100' },
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  affects: '🔴 Affects',
  treats: '💊 Treats',
  grows_in: '🌱 Grows in',
  thrives_in: '☀️ Thrives in',
  companion_to: '🤝 Companion to',
  incompatible_with: '⚠️ Incompatible',
  seasonal_for: '📅 Seasonal for',
  found_in: '📍 Found in',
};

const KnowledgeGraphExplorer = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [edges, setEdges] = useState<KnowledgeEdge[]>([]);
  const [search, setSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [nodesRes, edgesRes] = await Promise.all([
        supabase.from('knowledge_nodes').select('*').order('interaction_count', { ascending: false }),
        supabase.from('knowledge_edges').select('*').order('weight', { ascending: false }),
      ]);
      if (nodesRes.data) setNodes(nodesRes.data);
      if (edgesRes.data) setEdges(edgesRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredNodes = nodes.filter(n => {
    const matchesSearch = !search || 
      n.name.toLowerCase().includes(search.toLowerCase()) ||
      (n.aliases && JSON.stringify(n.aliases).toLowerCase().includes(search.toLowerCase()));
    const matchesTab = activeTab === 'all' || n.node_type === activeTab;
    return matchesSearch && matchesTab;
  });

  const getNodeById = (id: string) => nodes.find(n => n.id === id);

  const getRelatedEdges = (nodeId: string) => 
    edges.filter(e => e.source_node_id === nodeId || e.target_node_id === nodeId);

  const getConnectedNodes = (nodeId: string) => {
    const related = getRelatedEdges(nodeId);
    return related.map(edge => {
      const otherId = edge.source_node_id === nodeId ? edge.target_node_id : edge.source_node_id;
      const otherNode = getNodeById(otherId);
      const direction = edge.source_node_id === nodeId ? 'outgoing' : 'incoming';
      return { edge, node: otherNode, direction };
    }).filter(r => r.node);
  };

  const nodeTypeCounts = nodes.reduce((acc, n) => {
    acc[n.node_type] = (acc[n.node_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-6 px-4">
        <div className="max-w-screen-sm mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mb-2 -ml-2 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
            <ArrowLeft className="w-4 h-4 mr-1" /> {t('back')}
          </Button>
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-7 h-7" />
            <h1 className="text-2xl font-bold">Knowledge Graph</h1>
          </div>
          <p className="text-primary-foreground/80 text-sm">
            {nodes.length} entities · {edges.length} relationships
          </p>
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(NODE_TYPE_CONFIG).slice(0, 4).map(([type, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={type}
                onClick={() => setActiveTab(activeTab === type ? 'all' : type)}
                className={`p-2 rounded-lg border text-center transition-colors ${
                  activeTab === type ? 'border-primary bg-primary/10' : 'border-border bg-card'
                }`}
              >
                <Icon className={`w-4 h-4 mx-auto mb-1 ${config.color}`} />
                <p className="text-lg font-bold text-foreground">{nodeTypeCounts[type] || 0}</p>
                <p className="text-[9px] text-muted-foreground capitalize">{type.replace('_', ' ')}</p>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search crops, pests, treatments..."
            value={search}
            onChange={e => { setSearch(e.target.value); setSelectedNode(null); }}
            className="pl-9"
          />
        </div>

        {/* Type filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <Badge
            variant={activeTab === 'all' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setActiveTab('all')}
          >
            All ({nodes.length})
          </Badge>
          {Object.entries(NODE_TYPE_CONFIG).map(([type, config]) => (
            <Badge
              key={type}
              variant={activeTab === type ? 'default' : 'outline'}
              className="cursor-pointer whitespace-nowrap capitalize"
              onClick={() => setActiveTab(type)}
            >
              {type.replace('_', ' ')} ({nodeTypeCounts[type] || 0})
            </Badge>
          ))}
        </div>

        {/* Selected Node Detail */}
        {selectedNode && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {(() => {
                    const config = NODE_TYPE_CONFIG[selectedNode.node_type];
                    const Icon = config?.icon || Leaf;
                    return (
                      <div className={`p-2 rounded-lg ${config?.bg || 'bg-muted'}`}>
                        <Icon className={`w-5 h-5 ${config?.color || 'text-foreground'}`} />
                      </div>
                    );
                  })()}
                  <div>
                    <CardTitle className="text-base">{selectedNode.name}</CardTitle>
                    <p className="text-xs text-muted-foreground capitalize">
                      {selectedNode.node_type.replace('_', ' ')} · Confidence: {Math.round(selectedNode.confidence_score * 100)}%
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedNode(null)} className="h-7 px-2 text-xs">✕</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedNode.aliases && JSON.parse(typeof selectedNode.aliases === 'string' ? selectedNode.aliases : JSON.stringify(selectedNode.aliases)).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Also known as</p>
                  <div className="flex flex-wrap gap-1">
                    {JSON.parse(typeof selectedNode.aliases === 'string' ? selectedNode.aliases : JSON.stringify(selectedNode.aliases)).map((alias: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">{alias}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Connected nodes */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Connections ({getConnectedNodes(selectedNode.id).length})
                </p>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {getConnectedNodes(selectedNode.id).map(({ edge, node, direction }) => {
                    if (!node) return null;
                    const config = NODE_TYPE_CONFIG[node.node_type];
                    const Icon = config?.icon || Leaf;
                    return (
                      <button
                        key={edge.id}
                        onClick={() => setSelectedNode(node)}
                        className="w-full flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left"
                      >
                        <div className={`p-1 rounded ${config?.bg || 'bg-muted'}`}>
                          <Icon className={`w-3.5 h-3.5 ${config?.color || ''}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{node.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {direction === 'outgoing' ? RELATIONSHIP_LABELS[edge.relationship] || edge.relationship : `← ${RELATIONSHIP_LABELS[edge.relationship] || edge.relationship}`}
                            {' · '}
                            {Math.round(edge.weight * 100)}% strength
                          </p>
                        </div>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      </button>
                    );
                  })}
                  {getConnectedNodes(selectedNode.id).length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">No connections yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Node List */}
        <div className="space-y-1.5">
          {filteredNodes.slice(0, 50).map(node => {
            const config = NODE_TYPE_CONFIG[node.node_type];
            const Icon = config?.icon || Leaf;
            const connectionCount = getRelatedEdges(node.id).length;
            return (
              <button
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                  selectedNode?.id === node.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-accent/50'
                }`}
              >
                <div className={`p-2 rounded-lg ${config?.bg || 'bg-muted'}`}>
                  <Icon className={`w-4 h-4 ${config?.color || ''}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{node.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {node.node_type.replace('_', ' ')} · {connectionCount} connection{connectionCount !== 1 ? 's' : ''} · {node.interaction_count} interactions
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-foreground">{Math.round(node.confidence_score * 100)}%</p>
                  <p className="text-[9px] text-muted-foreground">confidence</p>
                </div>
              </button>
            );
          })}
          {filteredNodes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No entities found</p>
              <p className="text-xs">Try a different search or filter</p>
            </div>
          )}
          {filteredNodes.length > 50 && (
            <p className="text-xs text-center text-muted-foreground py-2">
              Showing 50 of {filteredNodes.length} results
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraphExplorer;
