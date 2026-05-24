[21:49, 19/05/2026] Manar🔮: // generateHash.js — script utilitaire pour générer des mots de passe hachés
const bcrypt = require('bcryptjs');

// Mets ici les mots de passe que tu veux pour tes admins
const motsDePasse = [
  'AdminPass1',
  'AdminPass2',
  'AdminPass3',
];

async function genererHashes() {
  for (const mdp of motsDePasse) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(mdp, salt);
    console.log(Mot de passe: ${mdp});
    console.log(Hash:         ${hash});
    console.log('---');
  }
}

genererHashes();
[21:51, 19/05/2026] Manar🔮: // generateHash.js
const bcrypt = require('bcryptjs');

const motsDePasse = [
  'AdminPass1',
  'AdminPass2',
  'AdminPass3',
];

async function genererHashes() {
  console.log('=== Génération des hash en cours... ===');
  for (const mdp of motsDePasse) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(mdp, salt);
    console.log(Mot de passe: ${mdp});
    console.log(Hash:         ${hash});
    console.log('---');
  }
  console.log('=== Terminé ===');
}

genererHashes();