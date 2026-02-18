import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Trash2, Brain } from "lucide-react";
import { DD_CATEGORIES } from "@/data/dd-checklist-playbook";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useVirtualizer } from "@tanstack/react-virtual";

interface Props {
  documents: any[];
  onUpload: (file: File, category: string) => void;
  onDelete: (id: string) => void;
  onAnalyze: (docId: string) => void;
  uploading: boolean;
  analyzing: string | null;
}

export default function DDDataRoom({ documents, onUpload, onDelete, onAnalyze, uploading, analyzing }: Props) {
  const [category, setCategory] = useState("financeiro");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const parentRef = useRef<HTMLDivElement>(null);

  const filteredDocs = useMemo(() => {
    if (filterCategory === "all") return documents;
    return documents.filter((d) => d.category === filterCategory);
  }, [documents, filterCategory]);

  const rowVirtualizer = useVirtualizer({
    count: filteredDocs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file, category);
      e.target.value = "";
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      uploaded: { label: "Enviado", cls: "bg-muted text-muted-foreground" },
      analyzed: { label: "Analisado", cls: "bg-success/10 text-success" },
      pending_review: { label: "Pendente Revisão", cls: "bg-warning/10 text-warning" },
    };
    const info = map[s] || { label: s, cls: "" };
    return <Badge className={info.cls}>{info.label}</Badge>;
  };

  const catLabel = (key: string) => DD_CATEGORIES.find((c) => c.key === key)?.label || key;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="font-display text-base flex items-center gap-2"><Upload className="w-4 h-4" />Enviar Documento</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>{DD_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Arquivo</Label>
              <Input type="file" accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.csv" onChange={handleFileChange} disabled={uploading} />
            </div>
          </div>
        </CardContent>
      </Card>

      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="font-display text-base">Documentos ({filteredDocs.length})</CardTitle>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue placeholder="Filtrar categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  {DD_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div 
              ref={parentRef} 
              className="max-h-[600px] overflow-auto"
              style={{ contain: 'strict' }}
            >
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const doc = filteredDocs[virtualRow.index];
                  return (
                    <div
                      key={virtualRow.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                        paddingBottom: '8px'
                      }}
                    >
                      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card h-full">
                        <FileText className="w-5 h-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.file_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{catLabel(doc.category)}</span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString("pt-BR")}</span>
                            {doc.file_size && <><span className="text-xs text-muted-foreground">·</span><span className="text-xs text-muted-foreground">{(doc.file_size / 1024).toFixed(0)} KB</span></>}
                          </div>
                          {doc.ai_analysis && <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap line-clamp-2">{doc.ai_analysis}</p>}
                        </div>
                        {statusBadge(doc.status)}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onAnalyze(doc.id)} disabled={analyzing === doc.id}>
                          <Brain className={`w-4 h-4 ${analyzing === doc.id ? "animate-pulse" : ""}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(doc.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget) onDelete(deleteTarget); setDeleteTarget(null); }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}