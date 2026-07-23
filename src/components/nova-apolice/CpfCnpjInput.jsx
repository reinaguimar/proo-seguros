import React from 'react';
import { Input } from "@/components/ui/input";

const CpfCnpjInput = ({ value = '', onChange, ...props }) => {
  const handleChange = (e) => {
    let inputValue = e.target.value;
    
    const numericValue = inputValue.replace(/[^\d]/g, '');

    if (numericValue.length <= 11) {
      inputValue = numericValue
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      inputValue = numericValue.slice(0, 14)
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    
    onChange(inputValue);
  };

  return (
    <Input
      value={value}
      onChange={handleChange}
      maxLength="18"
      {...props}
    />
  );
};

export default CpfCnpjInput;