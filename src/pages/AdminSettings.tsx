import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Shield, Bell, Globe } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface SettingRow {
  id: string;
  key: string;
  value: boolean;
  updated_at: string;
  updated_by: string | null;
}

export default function AdminSettings() {
  const { roles, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = roles.includes("admin");

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*");
      if (error) throw error;
      return (data as any[]).map((r) => ({
        ...r,
        value: r.value === true || r.value === "true",
      })) as SettingRow[];
    },
    enabled: isAdmin,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { error } = await supabase
        .from("admin_settings")
        .update({ value: value as any, updated_at: new Date().toISOString(), updated_by: user?.id } as any)
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast({ title: "Configuração salva" });
    },
    onError: (e: any) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Você precisa de acesso de administrador para ver esta página.</p>
      </div>
    );
  }

  const getValue = (key: string) => settings.find((s) => s.key === key)?.value ?? false;

  const handleToggle = (key: string, checked: boolean) => {
    toggleMutation.mutate({ key, value: checked });
  };

  const settingsConfig = [
    {
      title: "Segurança",
      icon: Shield,
      items: [
        { key: "two_factor_required", label: "Autenticação em dois fatores", description: "Exigir 2FA para todos os usuários" },
        { key: "session_timeout", label: "Sessão automática", description: "Encerrar sessões inativas após 30 min" },
      ],
    },
    {
      title: "Notificações",
      icon: Bell,
      items: [
        { key: "email_notifications", label: "Notificações por e-mail", description: "Enviar alertas por e-mail para admins" },
        { key: "new_user_alert", label: "Novo usuário", description: "Alertar quando um novo usuário se cadastrar" },
      ],
    },
    {
      title: "Geral",
      icon: Globe,
      items: [
        { key: "maintenance_mode", label: "Modo manutenção", description: "Desabilitar acesso para não-admins" },
        { key: "open_signup", label: "Cadastro aberto", description: "Permitir novos cadastros na plataforma" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">Configurações gerais da plataforma</p>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {settingsConfig.map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <section.icon className="w-5 h-5 text-primary" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {section.items.map((item, idx) => (
                  <div key={item.key}>
                    {idx > 0 && <Separator className="mb-4" />}
                    <div className="flex items-center justify-between">
                      <Label htmlFor={item.key} className="flex flex-col gap-1">
                        <span>{item.label}</span>
                        <span className="text-sm text-muted-foreground font-normal">{item.description}</span>
                      </Label>
                      <Switch
                        id={item.key}
                        checked={getValue(item.key)}
                        onCheckedChange={(checked) => handleToggle(item.key, checked)}
                        disabled={toggleMutation.isPending}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                APIs Externas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                As chaves de API (Apollo, Lusha, Perplexity, Google CSE) são gerenciadas de forma segura pelo backend.
                Para atualizar, entre em contato com o administrador do sistema.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
