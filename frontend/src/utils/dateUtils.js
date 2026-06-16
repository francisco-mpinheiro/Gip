export const formatDateLocal = (dateString, options) => {
  if (!dateString) return '';
  try {
    // If it's an ISO string or YYYY-MM-DD, extract the date parts to avoid timezone shifting
    const datePart = dateString.includes('T') ? dateString.split('T')[0] : dateString.split(' ')[0];
    const [y, m, d] = datePart.split('-');
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('pt-BR', options);
  } catch (e) {
    return new Date(dateString).toLocaleDateString('pt-BR', options);
  }
};
