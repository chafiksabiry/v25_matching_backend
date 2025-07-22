# Mise à jour de l'algorithme de matching - Utilisation des IDs et Expérience

## Vue d'ensemble

L'algorithme de matching a été mis à jour pour utiliser les IDs des skills (languages, soft, technical, professional) au lieu des noms, et inclut maintenant un système de scoring basé sur les années d'expérience.

## Changements principaux

### 1. Fonction `calculateSkillsScore`

**Avant :**
- Comparaison par noms de skills normalisés
- Recherche textuelle avec correspondance partielle
- Logique complexe de normalisation des chaînes

**Après :**
- Comparaison directe par IDs des skills
- Correspondance exacte par ObjectId
- Logique simplifiée et plus précise

```javascript
// Nouvelle logique
const agentSkill = agentSkills.find(agentSkill => {
  const agentSkillId = agentSkill.skill?.toString();
  return agentSkillId === gigSkillId;
});
```

### 2. Fonction `calculateLanguageScore`

**Avant :**
- Comparaison par noms de langues normalisés
- Recherche textuelle avec correspondance partielle

**Après :**
- Comparaison directe par IDs des langues
- Correspondance exacte par ObjectId
- Récupération des noms pour l'affichage

```javascript
// Nouvelle logique
const agentLang = agent.personalInfo.languages.find(agentLang => {
  const agentLangId = agentLang.language?.toString();
  return agentLangId === gigLangId;
});
```

### 3. Nouvelle fonction `calculateExperienceScore`

**Fonctionnalité :**
- Comparaison des années d'expérience entre l'agent et le gig
- Scoring basé sur la correspondance exacte et les seuils
- Gestion des cas où l'agent est overqualified

```javascript
// Logique de scoring
if (agentExperience >= gigExperience) {
  if (agentExperience === gigExperience) {
    return 1.0; // Match parfait
  } else if (agentExperience <= gigExperience * 1.5) {
    return 0.9; // Légèrement plus d'expérience (bon)
  } else if (agentExperience <= gigExperience * 2) {
    return 0.8; // Plus d'expérience mais acceptable
  } else {
    return 0.7; // Beaucoup plus d'expérience (peut être overqualified)
  }
} else {
  // Logique pour expérience insuffisante
  if (agentExperience >= gigExperience * 0.8) {
    return 0.6; // Presque suffisant
  } else if (agentExperience >= gigExperience * 0.6) {
    return 0.4; // Partiellement suffisant
  } else {
    return 0.0; // Complètement insuffisant
  }
}
```

### 4. Contrôleur `findMatchesForGigById`

**Nouvelles fonctionnalités :**
- Calcul du score d'expérience pour chaque agent
- Inclusion de l'expérience dans le filtrage séquentiel
- Statistiques d'expérience dans les résultats

## Structure des données

### Skills
```javascript
// Gig
skills: {
  professional: [{
    skill: "68681321c44e8a46719af378", // ObjectId
    level: 1
  }],
  technical: [{
    skill: "6868132ac44e8a46719af39e", // ObjectId
    level: 1
  }],
  soft: [{
    skill: "6868131dc44e8a46719af35c", // ObjectId
    level: 1
  }]
}

// Agent
skills: {
  professional: [{
    skill: "68681321c44e8a46719af378", // ObjectId
    level: 0
  }],
  technical: [{
    skill: "6868132ac44e8a46719af3a0", // ObjectId
    level: 0
  }],
  soft: [{
    skill: "6868131dc44e8a46719af35e", // ObjectId
    level: 0
  }]
}
```

### Languages
```javascript
// Gig
skills: {
  languages: [{
    language: "6878c3c4999b0fc08b1b14e3", // ObjectId
    proficiency: "B1",
    iso639_1: "fr"
  }]
}

// Agent
personalInfo: {
  languages: [{
    language: "6878c3c4999b0fc08b1b14e3", // ObjectId
    proficiency: "B2"
  }]
}
```

### Experience
```javascript
// Gig
seniority: {
  level: "Mid-Level",
  yearsExperience: "3"
}

// Agent
professionalSummary: {
  yearsOfExperience: 4,
  currentRole: "Ingénieure Informatique"
}
```

## Logique de scoring d'expérience

### Scores parfaits (1.0 - 0.9)
- **1.0** : Expérience exacte (agent: 3 ans, gig: 3 ans)
- **0.9** : Légèrement plus d'expérience (agent: 4-4.5 ans, gig: 3 ans)

### Scores partiels (0.8 - 0.6)
- **0.8** : Plus d'expérience mais acceptable (agent: 4.5-6 ans, gig: 3 ans)
- **0.7** : Beaucoup plus d'expérience (agent: 6+ ans, gig: 3 ans)
- **0.6** : Presque suffisant (agent: 2.4-3 ans, gig: 3 ans)

### Scores insuffisants (0.4 - 0.0)
- **0.4** : Partiellement suffisant (agent: 1.8-2.4 ans, gig: 3 ans)
- **0.2** : Insuffisant (agent: 1.2-1.8 ans, gig: 3 ans)
- **0.0** : Complètement insuffisant (agent: <1.2 ans, gig: 3 ans)

## Système de poids

### Poids par défaut
L'algorithme utilise un système de poids pour déterminer l'importance relative de chaque critère :

```javascript
const defaultWeights = {
  industry: 0.20,      // 20% - Correspondance d'industrie
  experience: 0.20,    // 20% - Correspondance d'expérience
  skills: 0.20,        // 20% - Correspondance de compétences
  language: 0.15,      // 15% - Correspondance de langues
  region: 0.15,        // 15% - Correspondance régionale
  availability: 0.10   // 10% - Correspondance de disponibilité
};
```

### Personnalisation des poids
Vous pouvez personnaliser les poids en les passant dans le body de la requête :

```json
{
  "weights": {
    "industry": 0.30,
    "experience": 0.30,
    "skills": 0.20,
    "language": 0.10,
    "availability": 0.10
  }
}
```

### Logique de filtrage séquentiel
Les critères sont appliqués dans l'ordre décroissant de leur poids :
1. **Industry** (20%) - Filtrage par industrie
2. **Experience** (20%) - Filtrage par années d'expérience
3. **Skills** (20%) - Filtrage par compétences
4. **Language** (15%) - Filtrage par langues
5. **Region** (15%) - Filtrage par région/timezone
6. **Availability** (10%) - Filtrage par disponibilité

### Impact des poids sur le matching
- **Poids élevé** : Le critère devient plus strict, moins d'agents passent le filtre
- **Poids faible** : Le critère devient plus flexible, plus d'agents passent le filtre
- **Poids nul** : Le critère est ignoré dans le filtrage

## Avantages de cette approche

1. **Précision** : Correspondance exacte par ID élimine les ambiguïtés
2. **Performance** : Comparaison directe plus rapide que la recherche textuelle
3. **Maintenabilité** : Code plus simple et moins sujet aux erreurs
4. **Extensibilité** : Facilite l'ajout de nouvelles langues/skills
5. **Internationalisation** : Support des noms dans différentes langues
6. **Expérience** : Matching intelligent basé sur les années d'expérience

## Fonctions utilitaires ajoutées

### `getSkillNames(skillIds, skillType)`
Récupère les noms des skills à partir de leurs IDs.

### `getLanguageNames(languageIds)`
Récupère les noms des langues à partir de leurs IDs.

### `calculateExperienceScore(agent, gig)`
Calcule le score d'expérience basé sur les années d'expérience.

## Tests avec Postman

### Endpoint principal
```
POST http://localhost:3000/api/matches/gig/{gigId}
```

### Body avec poids d'expérience
```json
{
  "weights": {
    "industry": 0.25,
    "experience": 0.25,
    "skills": 0.20,
    "languages": 0.15,
    "schedule": 0.15
  }
}
```

### Poids par défaut (si aucun body n'est fourni)
```json
{
  "industry": 0.20,
  "experience": 0.20,
  "skills": 0.20,
  "language": 0.15,
  "region": 0.15,
  "availability": 0.10
}
```

### Réponse attendue avec expérience
```json
{
  "preferedmatches": [
    {
      "agentId": "687ccf4d96d2b5a2c321c811",
      "experienceMatch": {
        "score": 0.9,
        "details": {
          "agentExperience": 4,
          "gigExperience": 3,
          "difference": 1,
          "reason": "Slightly more experience (good)"
        },
        "matchStatus": "perfect_match"
      }
    }
  ],
  "experienceStats": {
    "perfectMatches": 1,
    "partialMatches": 0,
    "noMatches": 0,
    "totalMatches": 1
  }
}
```

## Migration

Pour migrer les données existantes :
1. S'assurer que tous les skills et langues ont des IDs valides
2. Vérifier que les agents ont des `yearsOfExperience` dans `professionalSummary`
3. Mettre à jour les références dans les gigs et agents
4. Vérifier la cohérence des données

## Exemple d'utilisation

```javascript
// Test avec les données fournies
const matchResult = calculateMatchScore(testAgent, testGig);
console.log("Score total:", matchResult.score);
console.log("Détails:", matchResult.details);
// Résultat attendu : agent 4 ans vs gig 3 ans = score 0.9
```

## Notes importantes

- Les IDs doivent être des ObjectIds MongoDB valides
- La récupération des noms se fait de manière asynchrone
- Les mappings sont créés pour optimiser les performances
- La structure de réponse inclut à la fois les IDs et les noms pour la flexibilité
- L'expérience est maintenant un critère de matching important
- Le scoring d'expérience prend en compte l'overqualification 