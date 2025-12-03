// Simple number to words (English) helper for totals
// Handles numbers up to 999,999,999. Returns string like "One thousand two hundred thirty-four rupees and fifty paise only"
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function numberLessThanThousandToWords(num) {
  let str = ''
  if (num >= 100) {
    str += ones[Math.floor(num / 100)] + ' hundred'
    num = num % 100
    if (num) str += ' '
  }
  if (num >= 20) {
    str += tens[Math.floor(num / 10)]
    if (num % 10) str += ' ' + ones[num % 10]
  } else if (num > 0) {
    str += ones[num]
  }
  return str
}

export function numberToWords(amount) {
  if (isNaN(amount)) return ''
  const n = Math.abs(Math.round(amount * 100))
  const intPart = Math.floor(n / 100)
  const paise = n % 100

  if (intPart === 0 && paise === 0) return 'Zero rupees only'

  const parts = []
  const billions = Math.floor(intPart / 10000000) // crores
  const remainderAfterBillions = intPart % 10000000
  const lakhs = Math.floor(remainderAfterBillions / 100000)
  const remainderAfterLakhs = remainderAfterBillions % 100000
  const thousands = Math.floor(remainderAfterLakhs / 1000)
  const remainder = remainderAfterLakhs % 1000

  if (billions) parts.push(numberLessThanThousandToWords(Math.floor(billions / 100)) + ' crore')
  if (lakhs) parts.push(numberLessThanThousandToWords(lakhs) + ' lakh')
  if (thousands) parts.push(numberLessThanThousandToWords(thousands) + ' thousand')
  if (remainder) parts.push(numberLessThanThousandToWords(remainder))

  let words = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  if (!words) words = 'Zero'
  words = words + ' rupees'
  if (paise) words += ' and ' + numberLessThanThousandToWords(paise) + ' paise'
  words += ' only'
  return words
}

export default numberToWords
