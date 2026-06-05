const bcrypt = require('bcryptjs');
bcrypt.hash('Pluck4eva1981!', 10).then(h => console.log(h));
