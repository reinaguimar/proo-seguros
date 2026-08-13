import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const validateCPF = (cpf) => {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digits = cpf.split("").map(Number);
  const rest = (count) =>
    (digits.slice(0, count - 12).reduce((s, d, i) => s + d * (count - i), 0) * 10) % 11 % 10;
  return rest(10) === digits[9] && rest(11) === digits[10];
};

const validateCNPJ = (cnpj) => {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const digits = cnpj.split("").map(Number);
  const calc = (n) => {
    let s = 0, p = n - 7;
    for (let i = 0; i < n; i++) { s += digits[i] * p--; if (p < 2) p = 9; }
    return s % 11 < 2 ? 0 : 11 - (s % 11);
  };
  return calc(12) === digits[12] && calc(13) === digits[13];
};

export function cpfCnpjValidity(value) {
  const d = (value || "").replace(/\D/g, "");
  if (d.length === 11) return validateCPF(d);
  if (d.length === 14) return validateCNPJ(d);
  return false;
}

const mask = (digits) => {
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

export default function CpfCnpjInput({ value, onChange, className, ...props }) {
  const [touched, setTouched] = useState(false);

  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 14);
    onChange(digits);
  };

  const digits = (value || "").replace(/\D/g, "");
  const isValid = cpfCnpjValidity(digits);
  const showError = touched && digits.length > 0 && !isValid;

  return (
    <div className="w-full">
      <Input
        {...props}
        value={digits ? mask(digits) : ""}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        className={cn(showError ? "border-red-500 focus-visible:ring-red-500" : "", className)}
      />
      {showError && (
        <p className="text-xs text-red-500 mt-1">CPF/CNPJ inválido</p>
      )}
    </div>
  );
}