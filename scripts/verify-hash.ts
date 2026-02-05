import bcrypt from "bcryptjs";

const hash = "$2b$10$WmCCe8mYxqgHphMjWi2OjegtEndGDMPtKxvYVOJKQs4RlgohOk3Ta";
const password = "pmt";

bcrypt.compare(password, hash).then((match) => {
    console.log(`Password: "${password}"`);
    console.log(`Hash: "${hash}"`);
    console.log(`Match: ${match}`);
});
