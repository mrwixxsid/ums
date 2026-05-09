export const generatePassword = () => {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const symbols = '!@#$%&*';
  const all = upper + lower + digits + symbols;
  let pw = [upper, lower, digits, symbols].map(s => s[Math.floor(Math.random() * s.length)]).join('');
  for (let i = pw.length; i < 10; i++) pw += all[Math.floor(Math.random() * all.length)];
  return pw.split('').sort(() => Math.random() - 0.5).join('');
};
