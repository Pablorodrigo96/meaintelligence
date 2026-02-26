import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Shield, Bell, Globe } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function AdminSettings() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Você precisa de acesso de administrador para ver esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">Configurações gerais da plataforma</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="2fa" className="flex flex-col gap-1">
                <span>Autenticação em dois fatores</span>
                <span className="text-sm text-muted-foreground font-normal">Exigir 2FA para todos os usuários</span>
              </Label>
              <Switch id="2fa" disabled />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="session" className="flex flex-col gap-1">
                <span>Sessão automática</span>
                <span className="text-sm text-muted-foreground font-normal">Encerrar sessões inativas após 30 min</span>
              </Label>
              <Switch id="session" disabled />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notif" className="flex flex-col gap-1">
                <span>Notificações por e-mail</span>
                <span className="text-sm text-muted-foreground font-normal">Enviar alertas por e-mail para admins</span>
              </Label>
              <Switch id="email-notif" disabled />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="new-user" className="flex flex-col gap-1">
                <span>Novo usuário</span>
                <span className="text-sm text-muted-foreground font-normal">Alertar quando um novo usuário se cadastrar</span>
              </Label>
              <Switch id="new-user" disabled />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Geral
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="maintenance" className="flex flex-col gap-1">
                <span>Modo manutenção</span>
                <span className="text-sm text-muted-foreground font-normal">Desabilitar acesso para não-admins</span>
              </Label>
              <Switch id="maintenance" disabled />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="signup" className="flex flex-col gap-1">
                <span>Cadastro aberto</span>
                <span className="text-sm text-muted-foreground font-normal">Permitir novos cadastros na plataforma</span>
              </Label>
              <Switch id="signup" defaultChecked disabled />
            </div>
          </CardContent>
        </Card>

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
    </div>
  );
}
