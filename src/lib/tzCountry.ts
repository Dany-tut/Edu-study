// Maps an IANA timezone (e.g. "Europe/Moscow") to a country for analytics.
// Approximate — a browser timezone is a coarse geo proxy, not GeoIP. Covers CIS
// + common zones densely; falls back to the region (continent) when unknown.

export type Country = { code: string; name: string; flag: string }

// Direct IANA zone → country. Ordered roughly by expected audience (RU/CIS first).
const ZONE_COUNTRY: Record<string, Country> = {
  // Russia
  'Europe/Moscow': { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  'Europe/Kaliningrad': { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  'Europe/Samara': { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  'Europe/Volgograd': { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  'Europe/Saratov': { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  'Europe/Astrakhan': { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  'Europe/Ulyanovsk': { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  'Europe/Kirov': { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  'Asia/Yekaterinburg': { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  'Asia/Omsk': { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  'Asia/Novosibirsk': { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  'Asia/Novokuznetsk': { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  'Asia/Barnaul': { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  'Asia/Tomsk': { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  'Asia/Krasnoyarsk': { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  'Asia/Irkutsk': { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  'Asia/Chita': { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  'Asia/Yakutsk': { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  'Asia/Vladivostok': { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  'Asia/Magadan': { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  'Asia/Sakhalin': { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  'Asia/Kamchatka': { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  'Asia/Anadyr': { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  // CIS / neighbours
  'Europe/Kyiv': { code: 'UA', name: 'Украина', flag: '🇺🇦' },
  'Europe/Kiev': { code: 'UA', name: 'Украина', flag: '🇺🇦' },
  'Europe/Simferopol': { code: 'UA', name: 'Украина', flag: '🇺🇦' },
  'Europe/Minsk': { code: 'BY', name: 'Беларусь', flag: '🇧🇾' },
  'Europe/Chisinau': { code: 'MD', name: 'Молдова', flag: '🇲🇩' },
  'Asia/Almaty': { code: 'KZ', name: 'Казахстан', flag: '🇰🇿' },
  'Asia/Aqtobe': { code: 'KZ', name: 'Казахстан', flag: '🇰🇿' },
  'Asia/Aqtau': { code: 'KZ', name: 'Казахстан', flag: '🇰🇿' },
  'Asia/Atyrau': { code: 'KZ', name: 'Казахстан', flag: '🇰🇿' },
  'Asia/Oral': { code: 'KZ', name: 'Казахстан', flag: '🇰🇿' },
  'Asia/Qostanay': { code: 'KZ', name: 'Казахстан', flag: '🇰🇿' },
  'Asia/Tashkent': { code: 'UZ', name: 'Узбекистан', flag: '🇺🇿' },
  'Asia/Samarkand': { code: 'UZ', name: 'Узбекистан', flag: '🇺🇿' },
  'Asia/Bishkek': { code: 'KG', name: 'Киргизия', flag: '🇰🇬' },
  'Asia/Dushanbe': { code: 'TJ', name: 'Таджикистан', flag: '🇹🇯' },
  'Asia/Ashgabat': { code: 'TM', name: 'Туркменистан', flag: '🇹🇲' },
  'Asia/Baku': { code: 'AZ', name: 'Азербайджан', flag: '🇦🇿' },
  'Asia/Yerevan': { code: 'AM', name: 'Армения', flag: '🇦🇲' },
  'Asia/Tbilisi': { code: 'GE', name: 'Грузия', flag: '🇬🇪' },
  'Europe/Tallinn': { code: 'EE', name: 'Эстония', flag: '🇪🇪' },
  'Europe/Riga': { code: 'LV', name: 'Латвия', flag: '🇱🇻' },
  'Europe/Vilnius': { code: 'LT', name: 'Литва', flag: '🇱🇹' },
  // Europe (common)
  'Europe/London': { code: 'GB', name: 'Великобритания', flag: '🇬🇧' },
  'Europe/Berlin': { code: 'DE', name: 'Германия', flag: '🇩🇪' },
  'Europe/Paris': { code: 'FR', name: 'Франция', flag: '🇫🇷' },
  'Europe/Madrid': { code: 'ES', name: 'Испания', flag: '🇪🇸' },
  'Europe/Rome': { code: 'IT', name: 'Италия', flag: '🇮🇹' },
  'Europe/Warsaw': { code: 'PL', name: 'Польша', flag: '🇵🇱' },
  'Europe/Prague': { code: 'CZ', name: 'Чехия', flag: '🇨🇿' },
  'Europe/Amsterdam': { code: 'NL', name: 'Нидерланды', flag: '🇳🇱' },
  'Europe/Lisbon': { code: 'PT', name: 'Португалия', flag: '🇵🇹' },
  'Europe/Istanbul': { code: 'TR', name: 'Турция', flag: '🇹🇷' },
  'Europe/Belgrade': { code: 'RS', name: 'Сербия', flag: '🇷🇸' },
  'Europe/Athens': { code: 'GR', name: 'Греция', flag: '🇬🇷' },
  'Europe/Zurich': { code: 'CH', name: 'Швейцария', flag: '🇨🇭' },
  'Europe/Vienna': { code: 'AT', name: 'Австрия', flag: '🇦🇹' },
  'Europe/Helsinki': { code: 'FI', name: 'Финляндия', flag: '🇫🇮' },
  'Europe/Stockholm': { code: 'SE', name: 'Швеция', flag: '🇸🇪' },
  // Asia / Middle East
  'Asia/Dubai': { code: 'AE', name: 'ОАЭ', flag: '🇦🇪' },
  'Asia/Jerusalem': { code: 'IL', name: 'Израиль', flag: '🇮🇱' },
  'Asia/Tel_Aviv': { code: 'IL', name: 'Израиль', flag: '🇮🇱' },
  'Asia/Nicosia': { code: 'CY', name: 'Кипр', flag: '🇨🇾' },
  'Asia/Bangkok': { code: 'TH', name: 'Таиланд', flag: '🇹🇭' },
  'Asia/Shanghai': { code: 'CN', name: 'Китай', flag: '🇨🇳' },
  'Asia/Tokyo': { code: 'JP', name: 'Япония', flag: '🇯🇵' },
  'Asia/Seoul': { code: 'KR', name: 'Республика Корея', flag: '🇰🇷' },
  'Asia/Kolkata': { code: 'IN', name: 'Индия', flag: '🇮🇳' },
  // Americas
  'America/New_York': { code: 'US', name: 'США', flag: '🇺🇸' },
  'America/Chicago': { code: 'US', name: 'США', flag: '🇺🇸' },
  'America/Denver': { code: 'US', name: 'США', flag: '🇺🇸' },
  'America/Los_Angeles': { code: 'US', name: 'США', flag: '🇺🇸' },
  'America/Toronto': { code: 'CA', name: 'Канада', flag: '🇨🇦' },
  'America/Vancouver': { code: 'CA', name: 'Канада', flag: '🇨🇦' },
  'America/Sao_Paulo': { code: 'BR', name: 'Бразилия', flag: '🇧🇷' },
  'America/Argentina/Buenos_Aires': { code: 'AR', name: 'Аргентина', flag: '🇦🇷' },
}

// Region (first path segment) → coarse fallback bucket for unmapped zones.
const REGION_FALLBACK: Record<string, Country> = {
  Europe: { code: 'EU', name: 'Европа (прочее)', flag: '🌍' },
  Asia: { code: 'AS', name: 'Азия (прочее)', flag: '🌏' },
  America: { code: 'AM', name: 'Америка (прочее)', flag: '🌎' },
  Africa: { code: 'AF', name: 'Африка (прочее)', flag: '🌍' },
  Australia: { code: 'OC', name: 'Океания (прочее)', flag: '🌏' },
  Pacific: { code: 'OC', name: 'Океания (прочее)', flag: '🌏' },
  Atlantic: { code: 'XX', name: 'Другое', flag: '🏳️' },
  Indian: { code: 'AS', name: 'Азия (прочее)', flag: '🌏' },
}

const UNKNOWN: Country = { code: 'XX', name: 'Не определено', flag: '🏳️' }

export function tzToCountry(tz: string | null | undefined): Country {
  if (!tz) return UNKNOWN
  const direct = ZONE_COUNTRY[tz]
  if (direct) return direct
  const region = tz.split('/')[0]
  return REGION_FALLBACK[region] ?? UNKNOWN
}
