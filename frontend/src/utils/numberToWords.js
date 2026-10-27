// Converts numeric currency to Indian Rupee Words format
// e.g. 1198.00 -> "Rupees One Thousand One Hundred Ninety Eight Only"

export function numberToWords(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rupees Zero Only';

  const num = Math.abs(Number(amount));
  const n = Math.floor(num);
  const paise = Math.round((num - n) * 100);

  if (n === 0 && paise === 0) return 'Rupees Zero Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(val) {
    if (val < 20) return singleDigits[val];
    return tens[Math.floor(val / 10)] + (val % 10 !== 0 ? ' ' + singleDigits[val % 10] : '');
  }

  function convertGroup(val) {
    if (val === 0) return '';
    if (val < 100) return convertTwoDigits(val);
    const hundreds = singleDigits[Math.floor(val / 100)] + ' Hundred';
    const rest = val % 100;
    return rest !== 0 ? hundreds + ' ' + convertTwoDigits(rest) : hundreds;
  }

  let words = '';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const remainder = n % 1000;

  if (crore > 0) words += convertGroup(crore) + ' Crore ';
  if (lakh > 0) words += convertGroup(lakh) + ' Lakh ';
  if (thousand > 0) words += convertGroup(thousand) + ' Thousand ';
  if (remainder > 0) words += convertGroup(remainder) + ' ';

  words = words.trim();
  if (!words) words = 'Zero';

  let result = `Rupees ${words}`;
  if (paise > 0) {
    result += ` and ${convertTwoDigits(paise)} Paise`;
  }
  result += ' Only';

  return result;
}
