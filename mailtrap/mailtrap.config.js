const { MailtrapClient } = require("mailtrap");
const dotenv = require("dotenv");

dotenv.config();

const TOKEN = process.env.MAILTRAP_TOKEN;

exports.mailtrapClient = new MailtrapClient({
  token: TOKEN,
});

exports.sender = {
  email: "",
  name: "PredicTech",
};
