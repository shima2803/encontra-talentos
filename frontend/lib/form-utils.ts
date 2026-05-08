export function sanitizeDigits(value: string | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '');
}

export function sanitizePersonName(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' -]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trimStart();
}

export function sanitizeCityName(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' -]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trimStart();
}

export function parseCurrencyToNumber(value?: string | null): number | undefined {
  const digits = sanitizeDigits(value);

  if (!digits) {
    return undefined;
  }

  return Number(digits) / 100;
}

export function formatCurrencyInput(value?: string | null): string {
  const amount = parseCurrencyToNumber(value);

  if (amount === undefined) {
    return '';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateInput(value: string | null | undefined): string {
  const digits = sanitizeDigits(value).slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function dateBRToISO(value: string | null | undefined): string | undefined {
  const digits = sanitizeDigits(value);

  if (digits.length !== 8) {
    return undefined;
  }

  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  return `${year}-${month}-${day}`;
}

export function formatDDDInput(value: string | null | undefined): string {
  return sanitizeDigits(value).slice(0, 2);
}

export function formatPhoneInput(value: string | null | undefined): string {
  const digits = sanitizeDigits(value).slice(0, 9);

  if (digits.length <= 4) {
    return digits;
  }

  if (digits.length <= 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function normalizeSearch(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}