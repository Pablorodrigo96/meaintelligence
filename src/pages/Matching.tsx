import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Zap, Star, X, ChevronDown, ChevronUp, BarChart3, Target, TrendingUp, Globe, Building2, DollarSign, Shield, Filter, MapPin, Microscope, Info, UserCheck, CheckCircle2, ArrowRight, ArrowLeft, RotateCcw, ThumbsUp, ThumbsDown, Trophy, Database, Sparkles, Loader2, BrainCircuit, PencilLine, Bookmark, Phone, AlertCircle, Link2, Mail, ExternalLink, Instagram, Linkedin, MapPinned, Users, ArrowLeftRight, Download } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, PieChart, Pie, Cell } from "recharts";
import { BRAZILIAN_STATES, BRAZILIAN_CITIES, findCity, getCitiesByState } from "@/data/brazilian-cities";
import { haversineDistance } from "@/lib/geo";
import { DeepDiveDialog } from "@/components/DeepDiveDialog";

const sectors = [
  { value: "Technology", label: "Tecnologia" },
  { value: "Healthcare", label: "Saúde" },
  { value: "Finance", label: "Finanças" },
  { value: "Manufacturing", label: "Manufatura" },
  { value: "Energy", label: "Energia" },
  { value: "Retail", label: "Varejo" },
  { value: "Real Estate", label: "Imobiliário" },
  { value: "Agribusiness", label: "Agronegócio" },
  { value: "Logistics", label: "Logística" },
  { value: "Telecom", label: "Telecom" },
  { value: "Education", label: "Educação" },
  { value: "Other", label: "Outro" },
];

const profiles = [
  { value: "Strategic", label: "Estratégico" },
  { value: "Financial", label: "Financeiro" },
  { value: "Family Office", label: "Family Office" },
  { value: "Private Equity", label: "Private Equity" },
  { value: "Venture Capital", label: "Venture Capital" },
  { value: "Corporate", label: "Corporativo" },
];

const sizes = [
  { value: "Small", label: "Pequena (<R$50M)" },
  { value: "Medium", label: "Média (R$50M-R$500M)" },
  { value: "Large", label: "Grande (R$500M-R$5B)" },
  { value: "Enterprise", label: "Corporação (>R$5B)" },
];

const sectorLabel = (value: string | null) => sectors.find((s) => s.value === value)?.label || value || "—";

function normalizeNameForMatch(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

/** Format a raw numeric string as BRL display: "5000000" -> "5.000.000" */
function formatBRL(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("pt-BR");
}

/** Parse a BRL formatted string back to raw digits: "5.000.000" -> "5000000" */
function parseBRL(formatted: string): string {
  return formatted.replace(/\D/g, "");
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
}

interface Company {
  id: string;
  name: string;
  sector: string | null;
  location: string | null;
  state: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  size: string | null;
  description: string | null;
  revenue: number | null;
  ebitda: number | null;
  cash_flow: number | null;
  debt: number | null;
  risk_level: string | null;
  user_id: string;
  created_at: string;
}

interface Buyer {
  id: string;
  name: string;
  profile: string | null;
  sectors: string[] | null;
  location: string | null;
  state: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  min_revenue: number | null;
  max_revenue: number | null;
  min_ebitda: number | null;
  max_ebitda: number | null;
  description: string | null;
  user_id: string;
  created_at: string;
}

interface Match {
  id: string;
  company_id: string;
  buyer_id: string;
  score: number;
  status: string;
  notes: string | null;
  user_id: string;
  created_at: string;
  company?: Company;
  buyer?: Buyer;
}

interface BuyerProfile {
  name: string;
  profile: string;
  sectors: string[];
  min_revenue: number;
  max_revenue: number;
  min_ebitda?: number;
  max_ebitda?: number;
  location?: string;
  state?: string;
  city?: string;
  description: string;
  rationale: string;
  fit_score: number;
}

interface AIAnalysisResult {
  buyer_profiles: BuyerProfile[];
  investment_thesis: string;
}

const CNAE_TO_SECTOR: Record<string, string> = {
  "6201-5/00": "Technology",
  "6202-3/00": "Technology",
  "6203-1/00": "Technology",
  "6204-0/00": "Technology",
  "6209-1/00": "Technology",
  "8610-1/01": "Healthcare",
  "8610-1/02": "Healthcare",
  "8630-5/01": "Healthcare",
  "8630-5/02": "Healthcare",
  "8630-5/99": "Healthcare",
  "6421-2/00": "Finance",
  "6422-1/00": "Finance",
  "6423-9/00": "Finance",
  "6424-7/01": "Finance",
  "6424-7/02": "Finance",
  "6424-7/03": "Finance",
  "6424-7/04": "Finance",
  "6431-0/00": "Finance",
  "6432-8/00": "Finance",
  "6433-6/00": "Finance",
  "6434-4/00": "Finance",
  "6435-2/01": "Finance",
  "6435-2/02": "Finance",
  "6435-2/03": "Finance",
  "6436-1/00": "Finance",
  "6437-9/00": "Finance",
  "6438-7/00": "Finance",
  "6440-9/00": "Finance",
  "6450-6/00": "Finance",
  "6461-1/00": "Finance",
  "6462-0/00": "Finance",
  "6463-8/00": "Finance",
  "6470-1/01": "Finance",
  "6470-1/02": "Finance",
  "1011-2/01": "Manufacturing",
  "1011-2/02": "Manufacturing",
  "1012-1/01": "Manufacturing",
  "1012-1/02": "Manufacturing",
  "1013-9/01": "Manufacturing",
  "1013-9/02": "Manufacturing",
  "3511-5/01": "Energy",
  "3511-5/02": "Energy",
  "3512-3/00": "Energy",
  "3513-1/00": "Energy",
  "3514-0/00": "Energy",
  "4711-3/01": "Retail",
  "4711-3/02": "Retail",
  "4712-1/00": "Retail",
  "4713-0/01": "Retail",
  "4713-0/02": "Retail",
  "4713-0/03": "Retail",
  "4713-0/04": "Retail",
  "4713-0/05": "Retail",
  "6810-2/01": "Real Estate",
  "6810-2/02": "Real Estate",
  "6810-2/03": "Real Estate",
  "6821-8/01": "Real Estate",
  "6821-8/02": "Real Estate",
  "6822-6/00": "Real Estate",
  "0111-3/01": "Agribusiness",
  "0111-3/02": "Agribusiness",
  "0111-3/99": "Agribusiness",
  "0112-1/01": "Agribusiness",
  "0112-1/02": "Agribusiness",
  "0112-1/99": "Agribusiness",
  "4930-2/01": "Logistics",
  "4930-2/02": "Logistics",
  "4930-2/03": "Logistics",
  "4930-2/04": "Logistics",
  "5250-8/01": "Logistics",
  "5250-8/02": "Logistics",
  "5250-8/03": "Logistics",
  "5250-8/04": "Logistics",
  "5250-8/05": "Logistics",
  "6110-8/01": "Telecom",
  "6110-8/02": "Telecom",
  "6110-8/03": "Telecom",
  "6110-8/99": "Telecom",
  "6120-5/01": "Telecom",
  "6120-5/02": "Telecom",
  "6120-5/99": "Telecom",
  "6130-2/00": "Telecom",
  "6141-8/00": "Telecom",
  "6142-6/00": "Telecom",
  "6143-4/00": "Telecom",
  "6190-6/01": "Telecom",
  "6190-6/99": "Telecom",
  "8511-2/00": "Education",
  "8512-1/00": "Education",
  "8513-9/00": "Education",
  "8520-1/00": "Education",
  "8531-7/00": "Education",
  "8532-5/00": "Education",
  "8533-3/00": "Education",
  "8541-4/00": "Education",
  "8542-2/00": "Education",
  "8550-3/01": "Education",
  "8550-3/02": "Education",
  "8550-3/03": "Education",
  "8550-3/04": "Education",
  "8550-3/05": "Education",
  "8591-1/00": "Education",
  "8592-9/01": "Education",
  "8592-9/02": "Education",
  "8592-9/03": "Education",
  "8592-9/99": "Education",
  "8593-7/00": "Education",
  "8599-6/01": "Education",
  "8599-6/02": "Education",
  "8599-6/03": "Education",
  "8599-6/04": "Education",
  "8599-6/05": "Education",
  "8599-6/99": "Education",
};

const SECTOR_TO_CNAES: Record<string, string[]> = Object.entries(CNAE_TO_SECTOR).reduce(
  (acc, [cnae, sector]) => {
    if (!acc[sector]) acc[sector] = [];
    acc[sector].push(cnae);
    return acc;
  },
  {} as Record<string, string[]>,
);

function calculateMatchScore(company: Company, buyer: Buyer): number {
  let score = 0;
  if (buyer.sectors && buyer.sectors.length > 0 && company.sector) {
    if (buyer.sectors.includes(company.sector)) score += 30;
  }
  if (buyer.min_revenue !== null && company.revenue !== null) {
    if (company.revenue >= buyer.min_revenue) score += 20;
  }
  if (buyer.max_revenue !== null && company.revenue !== null) {
    if (company.revenue <= buyer.max_revenue) score += 20;
  }
  if (buyer.min_ebitda !== null && company.ebitda !== null) {
    if (company.ebitda >= buyer.min_ebitda) score += 15;
  }
  if (buyer.max_ebitda !== null && company.ebitda !== null) {
    if (company.ebitda <= buyer.max_ebitda) score += 15;
  }
  return Math.min(score, 100);
}

function FunnelCard({ title, count, color, icon: Icon }: { title: string; count: number; color: string; icon: any }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-2">{count}</p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Matching() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("matches");
  const [searchTerm, setSearchTerm] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState([0]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [notes, setNotes] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    company_name: "",
    cnpj: "",
    sector: "",
    state: "",
    city: "",
    description: "",
    revenue: "",
    ebitda: "",
    asking_price: "",
    min_revenue: "",
    max_revenue: "",
    min_ebitda: "",
    max_ebitda: "",
    target_sectors: [] as string[],
    target_profiles: [] as string[],
    target_state: "",
    target_city: "",
    max_distance: 500,
  });
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiProfiles, setAiProfiles] = useState<BuyerProfile[]>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<Set<number>>(new Set());
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [deepDiveCompany, setDeepDiveCompany] = useState<Company | null>(null);
  const [deepDiveBuyer, setDeepDiveBuyer] = useState<Buyer | null>(null);

  const citySuggestions = wizardData.state ? getCitiesByState(wizardData.state) : [];
  const targetCitySuggestions = wizardData.target_state ? getCitiesByState(wizardData.target_state) : [];

  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Company[];
    },
  });

  const { data: buyers = [], isLoading: loadingBuyers } = useQuery({
    queryKey: ["buyers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("buyers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Buyer[];
    },
  });

  const { data: matches = [], isLoading: loadingMatches } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("matches").select("*, company:companies(*), buyer:buyers(*)").order("score", { ascending: false });
      if (error) throw error;
      return data as Match[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("matches").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast({ title: "Status atualizado" });
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase.from("matches").update({ notes }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast({ title: "Notas salvas" });
      setSelectedMatch(null);
    },
  });

  const generateMatchesMutation = useMutation({
    mutationFn: async () => {
      const newMatches: { company_id: string; buyer_id: string; score: number; status: string; user_id: string }[] = [];
      for (const company of companies) {
        for (const buyer of buyers) {
          const score = calculateMatchScore(company, buyer);
          if (score >= 50) {
            const existing = matches.find((m) => m.company_id === company.id && m.buyer_id === buyer.id);
            if (!existing) {
              newMatches.push({ company_id: company.id, buyer_id: buyer.id, score, status: "new", user_id: user!.id });
            }
          }
        }
      }
      if (newMatches.length > 0) {
        const { error } = await supabase.from("matches").insert(newMatches);
        if (error) throw error;
      }
      return newMatches.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast({ title: `${count} novos matches gerados` });
    },
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (data: typeof wizardData) => {
      const cityData = findCity(data.city, data.state);
      const location = data.city && data.state ? `${data.city}, ${data.state}` : data.city || data.state || null;
      const payload = {
        name: data.company_name,
        cnpj: data.cnpj ? data.cnpj.replace(/\D/g, "") : null,
        sector: data.sector || null,
        location,
        state: data.state || null,
        city: data.city || null,
        latitude: cityData?.lat ?? null,
        longitude: cityData?.lng ?? null,
        description: data.description || null,
        revenue: data.revenue ? Number(parseBRL(data.revenue)) : null,
        ebitda: data.ebitda ? Number(parseBRL(data.ebitda)) : null,
        user_id: user!.id,
      };
      const { data: company, error } = await supabase.from("companies").insert(payload).select().single();
      if (error) throw error;
      return company as Company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });

  const createBuyersMutation = useMutation({
    mutationFn: async (profiles: BuyerProfile[]) => {
      const payload = profiles.map((p) => {
        const cityData = p.city && p.state ? findCity(p.city, p.state) : null;
        const location = p.city && p.state ? `${p.city}, ${p.state}` : p.city || p.state || null;
        return {
          name: p.name,
          profile: p.profile || null,
          sectors: p.sectors || null,
          location,
          state: p.state || null,
          city: p.city || null,
          latitude: cityData?.lat ?? null,
          longitude: cityData?.lng ?? null,
          min_revenue: p.min_revenue || null,
          max_revenue: p.max_revenue || null,
          min_ebitda: p.min_ebitda || null,
          max_ebitda: p.max_ebitda || null,
          description: p.description || null,
          user_id: user!.id,
        };
      });
      const { data, error } = await supabase.from("buyers").insert(payload).select();
      if (error) throw error;
      return data as Buyer[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buyers"] });
    },
  });

  const handleAIAnalysis = async () => {
    setAiAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-analyze", {
        body: {
          company_name: wizardData.company_name,
          cnpj: wizardData.cnpj,
          sector: wizardData.sector,
          state: wizardData.state,
          city: wizardData.city,
          description: wizardData.description,
          revenue: wizardData.revenue ? Number(parseBRL(wizardData.revenue)) : null,
          ebitda: wizardData.ebitda ? Number(parseBRL(wizardData.ebitda)) : null,
          asking_price: wizardData.asking_price ? Number(parseBRL(wizardData.asking_price)) : null,
          min_revenue: wizardData.min_revenue ? Number(parseBRL(wizardData.min_revenue)) : null,
          max_revenue: wizardData.max_revenue ? Number(parseBRL(wizardData.max_revenue)) : null,
          min_ebitda: wizardData.min_ebitda ? Number(parseBRL(wizardData.min_ebitda)) : null,
          max_ebitda: wizardData.max_ebitda ? Number(parseBRL(wizardData.max_ebitda)) : null,
          target_sectors: wizardData.target_sectors,
          target_profiles: wizardData.target_profiles,
          target_state: wizardData.target_state,
          target_city: wizardData.target_city,
          max_distance: wizardData.max_distance,
        },
      });
      if (error) throw error;
      const aiData = data as AIAnalysisResult | { result: AIAnalysisResult };
      const parsed = (aiData as any)?.result || aiData;
      const profiles: BuyerProfile[] = parsed.buyer_profiles || (Array.isArray(parsed) ? parsed : []);
      if (!profiles || profiles.length === 0) {
        throw new Error("A IA não encontrou perfis de compradores adequados. Tente ajustar os critérios de busca.");
      }
      setAiProfiles(profiles);
      setWizardStep(4);
    } catch (e: any) {
      toast({ title: "Erro na análise", description: e.message, variant: "destructive" });
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleWizardComplete = async () => {
    try {
      const company = await createCompanyMutation.mutateAsync(wizardData);
      const selectedProfilesList = aiProfiles.filter((_, i) => selectedProfiles.has(i));
      if (selectedProfilesList.length > 0) {
        await createBuyersMutation.mutateAsync(selectedProfilesList);
      }
      await generateMatchesMutation.mutateAsync();
      setWizardOpen(false);
      setWizardStep(1);
      setWizardData({
        company_name: "",
        cnpj: "",
        sector: "",
        state: "",
        city: "",
        description: "",
        revenue: "",
        ebitda: "",
        asking_price: "",
        min_revenue: "",
        max_revenue: "",
        min_ebitda: "",
        max_ebitda: "",
        target_sectors: [],
        target_profiles: [],
        target_state: "",
        target_city: "",
        max_distance: 500,
      });
      setAiProfiles([]);
      setSelectedProfiles(new Set());
      toast({ title: "Processo concluído", description: "Empresa criada, compradores adicionados e matches gerados!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      const matchesSearch = m.company?.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.buyer?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSector = sectorFilter === "all" || m.company?.sector === sectorFilter;
      const matchesStatus = statusFilter === "all" || m.status === statusFilter;
      const matchesScore = m.score >= scoreFilter[0];
      return matchesSearch && matchesSector && matchesStatus && matchesScore;
    });
  }, [matches, searchTerm, sectorFilter, statusFilter, scoreFilter]);

  const stats = useMemo(() => {
    const total = matches.length;
    const newMatches = matches.filter((m) => m.status === "new").length;
    const contacted = matches.filter((m) => m.status === "contacted").length;
    const qualified = matches.filter((m) => m.status === "qualified").length;
    const avgScore = matches.length > 0 ? matches.reduce((sum, m) => sum + m.score, 0) / matches.length : 0;
    return { total, new: newMatches, contacted, qualified, avgScore };
  }, [matches]);

  const sectorDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    matches.forEach((m) => {
      const sector = m.company?.sector || "Other";
      dist[sector] = (dist[sector] || 0) + 1;
    });
    return Object.entries(dist).map(([name, value]) => ({ name: sectorLabel(name), value }));
  }, [matches]);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Matching Inteligente</h1>
          <p className="text-muted-foreground mt-1">Encontre os compradores ideais para suas empresas usando IA</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setWizardOpen(true)} className="gap-2">
            <Sparkles className="w-4 h-4" />
            Buscar Alvos com IA
          </Button>
          <Button onClick={() => generateMatchesMutation.mutate()} disabled={generateMatchesMutation.isPending} variant="outline" className="gap-2">
            <Zap className="w-4 h-4" />
            {generateMatchesMutation.isPending ? "Gerando..." : "Gerar Matches"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <FunnelCard title="Total de Matches" count={stats.total} color="bg-primary" icon={Target} />
        <FunnelCard title="Novos" count={stats.new} color="bg-blue-500" icon={Star} />
        <FunnelCard title="Contatados" count={stats.contacted} color="bg-yellow-500" icon={Phone} />
        <FunnelCard title="Qualificados" count={stats.qualified} color="bg-green-500" icon={CheckCircle2} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Nome da empresa ou comprador..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Setor</Label>
                  <Select value={sectorFilter} onValueChange={setSectorFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Setores</SelectItem>
                      {sectors.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="new">Novo</SelectItem>
                      <SelectItem value="contacted">Contatado</SelectItem>
                      <SelectItem value="qualified">Qualificado</SelectItem>
                      <SelectItem value="rejected">Rejeitado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Score Mínimo: {scoreFilter[0]}%</Label>
                  <Slider value={scoreFilter} onValueChange={setScoreFilter} max={100} step={5} />
                </div>
              </div>
            </CardContent>
          </Card>

          {loadingMatches ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredMatches.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum match encontrado. Ajuste os filtros ou gere novos matches.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredMatches.map((match) => (
                <Card key={match.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-primary" />
                            <span className="font-semibold">{match.company?.name}</span>
                          </div>
                          <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            <span className="font-semibold">{match.buyer?.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Globe className="w-4 h-4" />
                            {sectorLabel(match.company?.sector)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {match.company?.location || "—"}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {match.company?.revenue ? `R$${(match.company.revenue / 1e6).toFixed(1)}M` : "—"}
                          </span>
                        </div>
                        {match.notes && (
                          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                            <strong>Notas:</strong> {match.notes}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={match.score >= 80 ? "default" : match.score >= 60 ? "secondary" : "outline"} className="text-lg px-3 py-1">
                            {match.score}%
                          </Badge>
                          <Select value={match.status} onValueChange={(v) => updateStatusMutation.mutate({ id: match.id, status: v })}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">Novo</SelectItem>
                              <SelectItem value="contacted">Contatado</SelectItem>
                              <SelectItem value="qualified">Qualificado</SelectItem>
                              <SelectItem value="rejected">Rejeitado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDeepDiveCompany(match.company || null);
                              setDeepDiveBuyer(match.buyer || null);
                              setDeepDiveOpen(true);
                            }}
                          >
                            <Microscope className="w-4 h-4 mr-1" />
                            Deep Dive
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedMatch(match);
                              setNotes(match.notes || "");
                            }}
                          >
                            <PencilLine className="w-4 h-4 mr-1" />
                            Notas
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Distribuição por Setor</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={sectorDistribution} cx="50%" cy="50%" labelLine={false} label={(entry) => entry.name} outerRadius={80} fill="#8884d8" dataKey="value">
                      {sectorDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Score Médio por Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      { status: "Novo", score: matches.filter((m) => m.status === "new").reduce((sum, m) => sum + m.score, 0) / matches.filter((m) => m.status === "new").length || 0 },
                      { status: "Contatado", score: matches.filter((m) => m.status === "contacted").reduce((sum, m) => sum + m.score, 0) / matches.filter((m) => m.status === "contacted").length || 0 },
                      { status: "Qualificado", score: matches.filter((m) => m.status === "qualified").reduce((sum, m) => sum + m.score, 0) / matches.filter((m) => m.status === "qualified").length || 0 },
                      { status: "Rejeitado", score: matches.filter((m) => m.status === "rejected").reduce((sum, m) => sum + m.score, 0) / matches.filter((m) => m.status === "rejected").length || 0 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="score" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Pipeline de Vendas</CardTitle>
              <CardDescription>Acompanhe o progresso dos seus matches através do funil de vendas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {["new", "contacted", "qualified"].map((status) => {
                  const statusMatches = matches.filter((m) => m.status === status);
                  const percentage = matches.length > 0 ? (statusMatches.length / matches.length) * 100 : 0;
                  const labels: Record<string, string> = { new: "Novos", contacted: "Contatados", qualified: "Qualificados" };
                  return (
                    <div key={status} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{labels[status]}</span>
                        <span className="text-sm text-muted-foreground">
                          {statusMatches.length} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <Progress value={percentage} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedMatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="font-display">Adicionar Notas</CardTitle>
              <CardDescription>
                {selectedMatch.company?.name} → {selectedMatch.buyer?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Digite suas notas aqui..." rows={6} />
              <div className="flex gap-2">
                <Button onClick={() => updateNotesMutation.mutate({ id: selectedMatch.id, notes })} disabled={updateNotesMutation.isPending} className="flex-1">
                  {updateNotesMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
                <Button variant="outline" onClick={() => setSelectedMatch(null)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {wizardOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="w-full max-w-4xl my-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Buscar Alvos com IA
                  </CardTitle>
                  <CardDescription>Passo {wizardStep} de 4</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setWizardOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Progress value={(wizardStep / 4) * 100} className="mt-4" />
            </CardHeader>
            <CardContent className="space-y-6">
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Informações da Empresa</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nome da Empresa *</Label>
                      <Input value={wizardData.company_name} onChange={(e) => setWizardData({ ...wizardData, company_name: e.target.value })} placeholder="Ex: Tech Solutions Ltda" />
                    </div>
                    <div className="space-y-2">
                      <Label>CNPJ</Label>
                      <Input
                        value={wizardData.cnpj}
                        onChange={(e) => {
                          const formatted = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 14)
                            .replace(/^(\d{2})(\d)/, "$1.$2")
                            .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
                            .replace(/\.(\d{3})(\d)/, ".$1/$2")
                            .replace(/(\d{4})(\d)/, "$1-$2");
                          setWizardData({ ...wizardData, cnpj: formatted });
                        }}
                        placeholder="XX.XXX.XXX/XXXX-XX"
                        maxLength={18}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Setor</Label>
                      <Select value={wizardData.sector} onValueChange={(v) => setWizardData({ ...wizardData, sector: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar setor" />
                        </SelectTrigger>
                        <SelectContent>
                          {sectors.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Select value={wizardData.state} onValueChange={(v) => setWizardData({ ...wizardData, state: v, city: "" })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {BRAZILIAN_STATES.map((s) => (
                            <SelectItem key={s.uf} value={s.uf}>
                              {s.uf} — {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      {citySuggestions.length > 0 ? (
                        <Select value={wizardData.city} onValueChange={(v) => setWizardData({ ...wizardData, city: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar cidade" />
                          </SelectTrigger>
                          <SelectContent>
                            {citySuggestions.map((c) => (
                              <SelectItem key={c.name} value={c.name}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input value={wizardData.city} onChange={(e) => setWizardData({ ...wizardData, city: e.target.value })} placeholder="Nome da cidade" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Faturamento Anual (R$)</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={wizardData.revenue}
                        onChange={(e) => setWizardData({ ...wizardData, revenue: formatBRL(e.target.value) })}
                        placeholder="Ex: 5.000.000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>EBITDA (R$)</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={wizardData.ebitda}
                        onChange={(e) => setWizardData({ ...wizardData, ebitda: formatBRL(e.target.value) })}
                        placeholder="Ex: 1.000.000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Preço Pedido (R$)</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={wizardData.asking_price}
                        onChange={(e) => setWizardData({ ...wizardData, asking_price: formatBRL(e.target.value) })}
                        placeholder="Ex: 10.000.000"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição da Empresa</Label>
                    <Textarea value={wizardData.description} onChange={(e) => setWizardData({ ...wizardData, description: e.target.value })} placeholder="Descreva a empresa, seus produtos/serviços, diferenciais..." rows={4} />
                  </div>
                  <Button onClick={() => setWizardStep(2)} disabled={!wizardData.company_name} className="w-full">
                    Próximo
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Critérios de Busca</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Faturamento Mínimo (R$)</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={wizardData.min_revenue}
                        onChange={(e) => setWizardData({ ...wizardData, min_revenue: formatBRL(e.target.value) })}
                        placeholder="Ex: 1.000.000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Faturamento Máximo (R$)</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={wizardData.max_revenue}
                        onChange={(e) => setWizardData({ ...wizardData, max_revenue: formatBRL(e.target.value) })}
                        placeholder="Ex: 100.000.000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>EBITDA Mínimo (R$)</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={wizardData.min_ebitda}
                        onChange={(e) => setWizardData({ ...wizardData, min_ebitda: formatBRL(e.target.value) })}
                        placeholder="Ex: 500.000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>EBITDA Máximo (R$)</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={wizardData.max_ebitda}
                        onChange={(e) => setWizardData({ ...wizardData, max_ebitda: formatBRL(e.target.value) })}
                        placeholder="Ex: 20.000.000"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Setores de Interesse</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {sectors.map((s) => (
                        <div key={s.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`sector-${s.value}`}
                            checked={wizardData.target_sectors.includes(s.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setWizardData({ ...wizardData, target_sectors: [...wizardData.target_sectors, s.value] });
                              } else {
                                setWizardData({ ...wizardData, target_sectors: wizardData.target_sectors.filter((v) => v !== s.value) });
                              }
                            }}
                          />
                          <label htmlFor={`sector-${s.value}`} className="text-sm cursor-pointer">
                            {s.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Perfis de Comprador</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {profiles.map((p) => (
                        <div key={p.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`profile-${p.value}`}
                            checked={wizardData.target_profiles.includes(p.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setWizardData({ ...wizardData, target_profiles: [...wizardData.target_profiles, p.value] });
                              } else {
                                setWizardData({ ...wizardData, target_profiles: wizardData.target_profiles.filter((v) => v !== p.value) });
                              }
                            }}
                          />
                          <label htmlFor={`profile-${p.value}`} className="text-sm cursor-pointer">
                            {p.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setWizardStep(1)} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Voltar
                    </Button>
                    <Button onClick={() => setWizardStep(3)} className="flex-1">
                      Próximo
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Localização e Distância</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Estado Alvo</Label>
                      <Select value={wizardData.target_state} onValueChange={(v) => setWizardData({ ...wizardData, target_state: v, target_city: "" })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Qualquer estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Qualquer estado</SelectItem>
                          {BRAZILIAN_STATES.map((s) => (
                            <SelectItem key={s.uf} value={s.uf}>
                              {s.uf} — {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade Alvo</Label>
                      {targetCitySuggestions.length > 0 ? (
                        <Select value={wizardData.target_city} onValueChange={(v) => setWizardData({ ...wizardData, target_city: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Qualquer cidade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Qualquer cidade</SelectItem>
                            {targetCitySuggestions.map((c) => (
                              <SelectItem key={c.name} value={c.name}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input value={wizardData.target_city} onChange={(e) => setWizardData({ ...wizardData, target_city: e.target.value })} placeholder="Qualquer cidade" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Distância Máxima: {wizardData.max_distance}km</Label>
                    <Slider value={[wizardData.max_distance]} onValueChange={(v) => setWizardData({ ...wizardData, max_distance: v[0] })} min={50} max={2000} step={50} />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setWizardStep(2)} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Voltar
                    </Button>
                    <Button onClick={handleAIAnalysis} disabled={aiAnalyzing} className="flex-1">
                      {aiAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analisando...
                        </>
                      ) : (
                        <>
                          <BrainCircuit className="w-4 h-4 mr-2" />
                          Analisar com IA
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Perfis de Compradores Sugeridos</h3>
                  <p className="text-sm text-muted-foreground">Selecione os perfis que deseja adicionar ao banco de dados</p>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {aiProfiles.map((profile, index) => (
                      <Card key={index} className={selectedProfiles.has(index) ? "border-primary" : ""}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={`profile-${index}`}
                              checked={selectedProfiles.has(index)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(selectedProfiles);
                                if (checked) {
                                  newSet.add(index);
                                } else {
                                  newSet.delete(index);
                                }
                                setSelectedProfiles(newSet);
                              }}
                            />
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <label htmlFor={`profile-${index}`} className="font-semibold cursor-pointer">
                                  {profile.name}
                                </label>
                                <Badge>{profile.fit_score}% fit</Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{profile.profile}</span>
                                <span>•</span>
                                <span>{profile.sectors.join(", ")}</span>
                                {profile.location && (
                                  <>
                                    <span>•</span>
                                    <span>{profile.location}</span>
                                  </>
                                )}
                              </div>
                              <p className="text-sm">{profile.description}</p>
                              <Collapsible>
                                <CollapsibleTrigger className="text-sm text-primary hover:underline flex items-center gap-1">
                                  Ver análise completa
                                  <ChevronDown className="w-3 h-3" />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-2 text-sm text-muted-foreground bg-muted p-3 rounded-md">{profile.rationale}</CollapsibleContent>
                              </Collapsible>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setWizardStep(3)} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Voltar
                    </Button>
                    <Button onClick={handleWizardComplete} disabled={selectedProfiles.size === 0 || createCompanyMutation.isPending || createBuyersMutation.isPending} className="flex-1">
                      {createCompanyMutation.isPending || createBuyersMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Concluir ({selectedProfiles.size} perfis)
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {deepDiveOpen && deepDiveCompany && deepDiveBuyer && <DeepDiveDialog open={deepDiveOpen} onOpenChange={setDeepDiveOpen} company={deepDiveCompany} buyer={deepDiveBuyer} />}
    </div>
  );
}
