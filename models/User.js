const crypto = require('crypto');

class User {
  static hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  static verifyPassword(password, storedHash) {
    const [salt, originalHash] = storedHash.split(':');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === originalHash;
  }

  static validateUserData(username, password, email) {
    const errors = [];

    if (!username || username.trim().length < 3) {
      errors.push('Username must be at least 3 characters');
    }

    if (!password || password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Invalid email format');
    }

    return errors;
  }

  static createUserObject(username, password, email = null) {
    return {
      username: username.trim(),
      password: this.hashPassword(password),
      email: email ? email.trim() : null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  static sanitizeUser(user) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

module.exports = User;
