# Utiliser une image Node.js légère
FROM node:18-alpine

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier uniquement les fichiers nécessaires pour installer les dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier tout le reste du projet dans le conteneur
COPY . .

# Définir les variables d'environnement
ENV MONGODB_URI=mongodb://harx:gcZ62rl8hoME@185.137.122.3:27017/V25_CompanySearchWizard
ENV PORT=5011

# Exposer le port utilisé par votre backend
EXPOSE 5011

# Démarrer l'application
CMD ["npm", "start"]
