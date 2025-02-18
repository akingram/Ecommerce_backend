const Joi = require("joi");
const createAccount = (data) => {
  const schema = Joi.object({
    name: Joi.string().required().min(4),
    email: Joi.string().required().email(),
    password: Joi.string().required().min(6),
    retypePassword: Joi.string().required().min(6),
  });
  return schema.validate(data);
};

const loginAccount = (data) => {
  const schema = Joi.object({
    email: Joi.string().required().email(),
    password: Joi.string().required().min(6),
  });
  return schema.validate(data);
};

const productValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    price: Joi.number().required(),
    description: Joi.string().required(),
    category: Joi.string().required(),
  });
  return schema.validate(data);
};
module.exports.createAccount = createAccount;
module.exports.loginAccount = loginAccount;
module.exports.productValidation = productValidation;
