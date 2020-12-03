const printTree = require('print-tree');
 
const tree = {
  name: '<EscopoPrincipal>',
  children: [],
};

const print = () => printTree(
    tree,
    node => node.name,
    node => {/*console.log('nodeee: ', node);*/ return node.children},
);

module.exports = {
    tree,
    print,
}