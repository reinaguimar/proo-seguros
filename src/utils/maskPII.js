/**
 * Mascara dados de PII para exibição nas telas de listagem.
 * O valor real não é alterado — o mascaramento é apenas visual.
 */
export function maskPII(value) {
  if (!value) return '-';
  const s = String(value).trim();
  if (!s) return '-';

  const digits = s.replace(/\D/g, '');

  // CPF: 11 dígitos → ***.XXX.XXX-**
  if (digits.length === 11) {
    return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
  }

  // CNPJ: 14 dígitos → **.XXX.XXX/XXXX-**
  if (digits.length === 14) {
    return `**.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-**`;
  }

  // Placa: valor alfanumérico com 6-8 chars (campo id_objeto) → mantém primeiros 3, mascara o resto
  if (s.length >= 5 && s.length <= 8 && /^[A-Z0-9]+$/i.test(s)) {
    return `${s.slice(0, 3)}***`;
  }

  return s;
}

/**
 * Formata CPF/CNPJ sem mascarar (para superadministradores).
 * Retorna o valor completo e formatado.
 */
export function formatCPFCNPJ(value) {
  if (!value) return '-';
  const s = String(value).trim();
  if (!s) return '-';

  const digits = s.replace(/\D/g, '');

  // CPF: 11 dígitos → XXX.XXX.XXX-XX
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }

  // CNPJ: 14 dígitos → XX.XXX.XXX/XXXX-XX
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
  }

  return s;
}