// Returns a shallow copy of obj containing only the listed keys that are defined.
module.exports = function pick(obj = {}, keys = []) {
  return keys.reduce((acc, key) => {
    if (obj[key] !== undefined) acc[key] = obj[key];
    return acc;
  }, {});
};
