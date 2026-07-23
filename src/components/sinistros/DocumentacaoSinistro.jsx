import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  CheckCircle2,
  XCircle,
  FileText,
  Image,
  Download,
  Loader2,
  Eye,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIPOS_DOCUMENTO = {
  cnh_condutor: {
    nome: "CNH do Condutor",
    descricao: "Carteira Nacional de Habilitação do condutor no momento do sinistro",
    multiplo: false,
    icon: FileText
  },
  documento_veiculo: {
    nome: "Documento do Veículo",
    descricao: "CRLV ou CRV do veículo segurado",
    multiplo: false,
    icon: FileText
  },
  boletim_ocorrencia: {
    nome: "Boletim de Ocorrência",
    descricao: "B.O. registrado sobre o sinistro",
    multiplo: false,
    icon: FileText
  },
  carta_descricao: {
    nome: "Carta de Descrição",
    descricao: "Carta descrevendo como o evento ocorreu",
    multiplo: false,
    icon: FileText
  },
  foto_colisao: {
    nome: "Fotos da Colisão",
    descricao: "Fotos dos danos causados ao veículo",
    multiplo: true,
    icon: Image
  }
};

export default function DocumentacaoSinistro({ sinistro, onDocumentacaoCompleta }) {
  const [documentos, setDocumentos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    carregarDocumentos();
  }, [sinistro.id]);

  const carregarDocumentos = async () => {
    try {
      setLoadingDocs(true);
      const docs = await base44.entities.DocumentoSinistro.filter({
        id_sinistro: sinistro.id
      });
      setDocumentos(docs);
    } catch (err) {
      console.error("Erro ao carregar documentos:", err);
      setError("Erro ao carregar documentos.");
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleUpload = async (tipo, file) => {
    setError(null);
    setUploading(true);

    try {
      // Upload do arquivo para storage privado
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });

      // Salvar registro do documento
      await base44.entities.DocumentoSinistro.create({
        id_sinistro: sinistro.id,
        numero_sinistro: sinistro.numero_sinistro,
        tipo_documento: tipo,
        nome_arquivo: file.name,
        file_uri: file_uri,
        tipo_mime: file.type,
        tamanho_bytes: file.size,
        data_upload: new Date().toISOString()
      });

      setSuccessMessage("Documento enviado com sucesso!");
      setTimeout(() => setSuccessMessage(null), 3000);
      await carregarDocumentos();
    } catch (err) {
      console.error("Erro ao fazer upload:", err);
      setError("Erro ao enviar documento. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: doc.file_uri,
        expires_in: 300
      });

      // Abrir em nova aba para visualização
      const newTab = window.open('', '_blank');
      if (newTab) {
        newTab.location.href = signed_url;
      }
    } catch (err) {
      console.error("Erro ao gerar URL:", err);
      setError("Erro ao acessar documento.");
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm("Deseja realmente excluir este documento?")) {
      return;
    }

    try {
      await base44.entities.DocumentoSinistro.delete(doc.id);
      setSuccessMessage("Documento excluído com sucesso!");
      setTimeout(() => setSuccessMessage(null), 3000);
      await carregarDocumentos();
    } catch (err) {
      console.error("Erro ao excluir:", err);
      setError("Erro ao excluir documento.");
    }
  };

  const verificarDocumentacaoCompleta = () => {
    const obrigatorios = Object.keys(TIPOS_DOCUMENTO).filter(k => k !== 'foto_colisao');
    const enviados = obrigatorios.every(tipo => 
      documentos.some(d => d.tipo_documento === tipo)
    );
    const temFotos = documentos.some(d => d.tipo_documento === 'foto_colisao');
    return enviados && temFotos;
  };

  const getDocumentosPorTipo = (tipo) => {
    return documentos.filter(d => d.tipo_documento === tipo);
  };

  const isDocumentoEnviado = (tipo) => {
    return documentos.some(d => d.tipo_documento === tipo);
  };

  if (loadingDocs) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  const documentacaoCompleta = verificarDocumentacaoCompleta();

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Documentação do Sinistro
          {documentacaoCompleta && (
            <Badge className="bg-green-100 text-green-800 ml-2">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Completa
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {successMessage && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-800">
            <strong>Importante:</strong> Todos os documentos devem ser enviados antes de prosseguir para análise.
            Os documentos podem ser enviados em momentos diferentes.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {Object.entries(TIPOS_DOCUMENTO).map(([tipo, info]) => {
            const Icon = info.icon;
            const docsEnviados = getDocumentosPorTipo(tipo);
            const enviado = docsEnviados.length > 0;

            return (
              <div key={tipo} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${enviado ? 'bg-green-100' : 'bg-slate-100'}`}>
                      <Icon className={`w-5 h-5 ${enviado ? 'text-green-600' : 'text-slate-500'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900">{info.nome}</h4>
                        {enviado && (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{info.descricao}</p>
                    </div>
                  </div>

                  {(!enviado || info.multiplo) && (
                    <div>
                      <Input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          if (e.target.files[0]) {
                            handleUpload(tipo, e.target.files[0]);
                          }
                        }}
                        className="hidden"
                        id={`upload-${tipo}`}
                        disabled={uploading}
                      />
                      <Label htmlFor={`upload-${tipo}`}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploading}
                          className="cursor-pointer"
                          onClick={() => document.getElementById(`upload-${tipo}`).click()}
                        >
                          {uploading ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          {enviado && info.multiplo ? 'Adicionar Mais' : 'Enviar'}
                        </Button>
                      </Label>
                    </div>
                  )}
                </div>

                {docsEnviados.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {docsEnviados.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between bg-slate-50 p-3 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="w-4 h-4 text-slate-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">{doc.nome_arquivo}</p>
                            <p className="text-xs text-slate-500">
                              Enviado em {format(new Date(doc.data_upload), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDownload(doc, e)}
                            type="button"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDelete(doc);
                            }}
                            type="button"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {documentacaoCompleta && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Todos os documentos foram enviados! Agora você pode adicionar o relato do evento e prosseguir para análise.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}