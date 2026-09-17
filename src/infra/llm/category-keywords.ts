import { ExpenseCategory } from '../../domain/value-objects/expense-category'

// Keywords are matched as whole words or whole phrases after normalization, so every
// inflection must be listed explicitly. Purely numeric keywords are forbidden: "99" would
// match amounts such as "Mercado 99,90", hence "99 pop" / "99pop" instead.
export const CATEGORY_KEYWORDS: Record<Exclude<ExpenseCategory, 'Outros'>, readonly string[]> = {
    'Alimentação': [
        'restaurante', 'restaurantes', 'lanchonete', 'lanche', 'lanches', 'pizza', 'pizzas', 'pizzaria',
        'pizza hut', 'hamburguer', 'hamburger', 'hamburgueria', 'burger king', 'mcdonalds', 'subway',
        'sushi', 'temaki', 'churrascaria', 'churrasco', 'mercado', 'supermercado', 'hortifruti',
        'padaria', 'acougue', 'feira', 'ifood', 'rappi', 'uber eats', 'delivery', 'almoco', 'jantar',
        'cafe da manha', 'cafeteria', 'acai', 'sorveteria', 'marmita', 'quitanda',
    ],
    'Transporte': [
        'uber', '99 pop', '99pop', '99 taxi', '99app', 'taxi', 'cabify', 'gasolina', 'combustivel',
        'etanol', 'diesel', 'posto', 'estacionamento', 'pedagio', 'onibus', 'metro', 'trem', 'brt',
        'passagem', 'passagens', 'oficina', 'mecanico', 'borracharia', 'ipva', 'licenciamento',
    ],
    'Moradia': [
        'aluguel', 'condominio', 'luz', 'energia', 'conta de agua', 'agua', 'gas', 'iptu', 'internet',
        'enel', 'sabesp', 'cemig', 'copel', 'diarista', 'faxina', 'reforma', 'moveis',
    ],
    'Lazer': [
        'cinema', 'show', 'ingresso', 'ingressos', 'teatro', 'viagem', 'hotel', 'pousada', 'airbnb',
        'bar', 'boteco', 'balada', 'boate', 'festa', 'parque', 'museu', 'boliche', 'karaoke',
    ],
    'Assinaturas': [
        'netflix', 'spotify', 'disney', 'hbo', 'prime video', 'amazon prime', 'youtube premium',
        'deezer', 'globoplay', 'paramount', 'crunchyroll', 'apple music', 'icloud', 'google one',
        'chatgpt', 'game pass', 'playstation plus', 'microsoft 365', 'office 365', 'adobe',
        'academia', 'smart fit', 'smartfit', 'gympass', 'wellhub', 'assinatura',
    ],
    'Saúde': [
        'farmacia', 'drogaria', 'droga raia', 'drogasil', 'pague menos', 'remedio', 'remedios',
        'consulta', 'medico', 'medica', 'dentista', 'exame', 'exames', 'laboratorio', 'hospital',
        'clinica', 'psicologo', 'psicologa', 'terapia', 'fisioterapia', 'vacina', 'plano de saude',
        'posto de saude',
    ],
    'Compras': [
        'roupa', 'roupas', 'sapato', 'sapatos', 'tenis', 'eletronico', 'eletronicos', 'celular',
        'notebook', 'presente', 'presentes', 'shopping', 'mercado livre', 'shopee', 'shein', 'amazon',
        'magazine luiza', 'magalu', 'americanas', 'renner', 'riachuelo', 'zara',
    ],
}
