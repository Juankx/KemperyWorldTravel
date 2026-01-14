const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

const validateClient = (req, res, next) => {
  const { first_name, last_name, email, phone } = req.body;
  const errors = [];

  if (!first_name || first_name.trim().length < 2) {
    errors.push('First name is required and must be at least 2 characters');
  }

  if (!last_name || last_name.trim().length < 2) {
    errors.push('Last name is required and must be at least 2 characters');
  }

  if (!email || !validateEmail(email)) {
    errors.push('Valid email is required');
  }

  if (phone && !validatePhone(phone)) {
    errors.push('Invalid phone number format');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

const validateBooking = (req, res, next) => {
  const { client_id, package_id, travel_date, return_date, participants } = req.body;
  const errors = [];

  if (!client_id) {
    errors.push('Client ID is required');
  }

  if (!package_id) {
    errors.push('Package ID is required');
  }

  if (!travel_date) {
    errors.push('Travel date is required');
  }

  if (!return_date) {
    errors.push('Return date is required');
  }

  if (travel_date && return_date && new Date(travel_date) >= new Date(return_date)) {
    errors.push('Return date must be after travel date');
  }

  if (!participants || participants < 1) {
    errors.push('At least 1 participant is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

module.exports = {
  validateEmail,
  validatePhone,
  validateClient,
  validateBooking
};
