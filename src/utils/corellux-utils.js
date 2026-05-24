/**
 * Corellux OS - Shared Utilities Module
 * Funções utilitárias reutilizáveis em toda a aplicação (React ES Modules)
 * v2.5.0
 */

export const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '0,00';
    const num = parseFloat(value);
    if (isNaN(num)) return '0,00';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T12:00:00');
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR');
};

export const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-BR');
};

export const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'agora';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m atrás`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
};

export const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined) return '0';
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

export const safeParseNumber = (input) => {
    if (input === null || input === undefined || input === '') return 0;

    let str = String(input).trim();

    // Remove separadores de milhar (pontos no formato BR)
    str = str.replace(/\./g, '');

    // Converte vírgula decimal para ponto
    str = str.replace(',', '.');

    // Permite apenas dígitos, ponto, sinal negativo e operadores matemáticos básicos
    if (!/^[\d\s\+\-\*\/\.\(\)]+$/.test(str)) {
        console.warn('[CorelluxUtils] Input contém caracteres inválidos:', input);
        return 0;
    }

    // Parser seguro de expressões matemáticas simples
    try {
        const sanitized = str.replace(/[^\d\+\-\*\/\.\(\)\s]/g, '');
        if (sanitized !== str.replace(/\s/g, '')) {
            console.warn('[CorelluxUtils] Expressão rejeitada:', input);
            return 0;
        }
        const result = new Function('return ' + sanitized)();
        const num = parseFloat(result);
        return isNaN(num) ? 0 : num;
    } catch (e) {
        console.warn('[CorelluxUtils] Falha ao parsear número:', input, e);
        return 0;
    }
};

export const parseInteger = (input, defaultValue = 0) => {
    if (input === null || input === undefined) return defaultValue;
    const num = parseInt(String(input).replace(/\D/g, ''), 10);
    return isNaN(num) ? defaultValue : num;
};

export const parseFloatNumber = (input, defaultValue = 0) => {
    if (input === null || input === undefined) return defaultValue;
    const str = String(input).replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? defaultValue : num;
};

export const escapeHtml = (str) => {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
};

export const escapeAttribute = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
};

export const escapeJsString = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
};

export const sanitizeInput = (input, maxLength = 500) => {
    if (input === null || input === undefined) return '';
    let str = String(input).trim();
    str = str.substring(0, maxLength);
    // Remove tags HTML
    str = str.replace(/<[^>]*>/g, '');
    // Remove scripts
    str = str.replace(/javascript:/gi, '');
    str = str.replace(/on\w+\s*=/gi, '');
    return str.trim();
};

export const sanitizeHtml = (html) => {
    if (!html) return '';
    // Remove tags perigosas
    const dangerousTags = /<(script|iframe|object|embed|form|input|textarea|select|button|link|meta|style|base|title|head|body|html|frame|frameset|applet|marquee|basefont|bgsound|xml|!)[^>]*>/gi;
    let clean = html.replace(dangerousTags, '');
    // Remove event handlers
    clean = clean.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
    clean = clean.replace(/\s+on\w+\s*=\s*\S+/gi, '');
    // Remove javascript:
    clean = clean.replace(/javascript\s*:/gi, '');
    // Remove data: URIs perigosos
    clean = clean.replace(/data\s*:(?!image\/)/gi, '');
    return clean;
};

export const linkify = (text) => {
    if (!text) return '';
    const safeText = escapeHtml(text);
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    return safeText.replace(urlRegex, (url) => {
        const cleanUrl = escapeAttribute(url);
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-orange); text-decoration: underline; font-weight: bold; cursor: pointer;">${cleanUrl}</a>`;
    });
};

export const Validators = {
    isEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).trim());
    },

    isCNPJ: (cnpj) => {
        const cleaned = String(cnpj).replace(/[^\d]/g, '');
        return cleaned.length === 14;
    },

    isCPF: (cpf) => {
        const cleaned = String(cpf).replace(/[^\d]/g, '');
        return cleaned.length === 11;
    },

    isPhone: (phone) => {
        const cleaned = String(phone).replace(/[^\d]/g, '');
        return cleaned.length >= 10 && cleaned.length <= 11;
    },

    isCEP: (cep) => {
        const cleaned = String(cep).replace(/[^\d]/g, '');
        return cleaned.length === 8;
    },

    isPositiveNumber: (value) => {
        const num = parseFloat(value);
        return !isNaN(num) && num > 0;
    },

    isInRange: (value, min, max) => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= min && num <= max;
    },

    isRequired: (value) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        return true;
    },

    minLength: (value, min) => {
        if (!value) return false;
        return String(value).length >= min;
    },

    maxLength: (value, max) => {
        if (!value) return true;
        return String(value).length <= max;
    }
};

export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
    return obj;
};

export const safeGet = (obj, path, defaultValue = null) => {
    if (!obj || !path) return defaultValue;
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
        if (current === null || current === undefined) return defaultValue;
        current = current[key];
    }
    return current !== undefined ? current : defaultValue;
};

export const uniqueBy = (array, key) => {
    const seen = new Set();
    return array.filter(item => {
        const value = item[key];
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
    });
};

export const groupBy = (array, key) => {
    return array.reduce((groups, item) => {
        const group = item[key];
        groups[group] = groups[group] || [];
        groups[group].push(item);
        return groups;
    }, {});
};

export const sortBy = (array, key, order = 'asc') => {
    return [...array].sort((a, b) => {
        let va = a[key], vb = b[key];
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va < vb) return order === 'asc' ? -1 : 1;
        if (va > vb) return order === 'asc' ? 1 : -1;
        return 0;
    });
};

export const debounce = (func, wait = 300) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

export const throttle = (func, limit = 300) => {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

export const isMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(navigator.userAgent);
    return isIOS || isAndroid || /webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const isTouchDevice = () => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

export const generateSKU = (prefix = 'ITEM') => {
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    const random = Math.random().toString(36).toUpperCase().substr(2, 3);
    return `${prefix}-${timestamp}${random}`;
};

export const generateLot = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `LT-${num}`;
};

const CorelluxUtils = {
    formatCurrency,
    formatDate,
    formatDateTime,
    formatTimeAgo,
    formatNumber,
    safeParseNumber,
    parseInteger,
    parseFloatNumber,
    escapeHtml,
    escapeAttribute,
    escapeJsString,
    sanitizeInput,
    sanitizeHtml,
    linkify,
    Validators,
    deepClone,
    safeGet,
    uniqueBy,
    groupBy,
    sortBy,
    debounce,
    throttle,
    isMobileDevice,
    isTouchDevice,
    generateId,
    generateSKU,
    generateLot
};

export default CorelluxUtils;
