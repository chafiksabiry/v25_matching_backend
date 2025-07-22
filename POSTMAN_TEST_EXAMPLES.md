# Exemples de tests Postman - Algorithme de Matching

## Configuration de base

### Variables d'environnement
```
base_url: http://localhost:3000
gig_id: 687ef19389a519df44e1601f
agent_id: 687ccf4d96d2b5a2c321c811
```

## Test 1: Poids par défaut (avec expérience)

### Endpoint
```
POST {{base_url}}/api/matches/gig/{{gig_id}}
```

### Headers
```
Content-Type: application/json
```

### Body (vide - utilise les poids par défaut)
```json
{}
```

### Poids appliqués automatiquement
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

### Réponse attendue
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

## Test 2: Poids personnalisés - Expérience prioritaire

### Endpoint
```
POST {{base_url}}/api/matches/gig/{{gig_id}}
```

### Body
```json
{
  "weights": {
    "experience": 0.40,
    "industry": 0.20,
    "skills": 0.15,
    "language": 0.10,
    "region": 0.10,
    "availability": 0.05
  }
}
```

### Explication
- **Experience** : 40% (très important)
- **Industry** : 20% (important)
- **Skills** : 15% (modéré)
- **Language** : 10% (peu important)
- **Region** : 10% (peu important)
- **Availability** : 5% (très peu important)

## Test 3: Poids personnalisés - Skills prioritaire

### Endpoint
```
POST {{base_url}}/api/matches/gig/{{gig_id}}
```

### Body
```json
{
  "weights": {
    "skills": 0.40,
    "experience": 0.20,
    "industry": 0.15,
    "language": 0.10,
    "region": 0.10,
    "availability": 0.05
  }
}
```

### Explication
- **Skills** : 40% (très important)
- **Experience** : 20% (important)
- **Industry** : 15% (modéré)
- **Language** : 10% (peu important)
- **Region** : 10% (peu important)
- **Availability** : 5% (très peu important)

## Test 4: Poids personnalisés - Langues prioritaire

### Endpoint
```
POST {{base_url}}/api/matches/gig/{{gig_id}}
```

### Body
```json
{
  "weights": {
    "language": 0.40,
    "experience": 0.20,
    "skills": 0.15,
    "industry": 0.10,
    "region": 0.10,
    "availability": 0.05
  }
}
```

### Explication
- **Language** : 40% (très important)
- **Experience** : 20% (important)
- **Skills** : 15% (modéré)
- **Industry** : 10% (peu important)
- **Region** : 10% (peu important)
- **Availability** : 5% (très peu important)

## Test 5: Poids équilibrés

### Endpoint
```
POST {{base_url}}/api/matches/gig/{{gig_id}}
```

### Body
```json
{
  "weights": {
    "experience": 0.17,
    "industry": 0.17,
    "skills": 0.17,
    "language": 0.17,
    "region": 0.16,
    "availability": 0.16
  }
}
```

### Explication
Tous les critères ont une importance similaire.

## Test 6: Recherche de gigs pour un agent

### Endpoint
```
POST {{base_url}}/api/matches/rep/{{agent_id}}
```

### Body
```json
{
  "weights": {
    "experience": 0.25,
    "industry": 0.20,
    "skills": 0.20,
    "language": 0.15,
    "region": 0.15,
    "availability": 0.05
  }
}
```

## Test 7: Optimisation globale

### Endpoint
```
POST {{base_url}}/api/matches/optimize
```

### Body
```json
{
  "weights": {
    "experience": 0.20,
    "industry": 0.20,
    "skills": 0.20,
    "language": 0.15,
    "region": 0.15,
    "availability": 0.10
  }
}
```

## Scripts de test Postman

### Script pour vérifier les poids appliqués
```javascript
pm.test("Weights are applied correctly", function () {
    var jsonData = pm.response.json();
    
    // Vérifier que la réponse contient des matches
    pm.expect(jsonData.preferedmatches).to.be.an('array');
    
    // Vérifier que les matches ont des scores d'expérience
    if (jsonData.preferedmatches.length > 0) {
        const firstMatch = jsonData.preferedmatches[0];
        pm.expect(firstMatch.experienceMatch).to.have.property('score');
        pm.expect(firstMatch.experienceMatch).to.have.property('details');
        pm.expect(firstMatch.experienceMatch).to.have.property('matchStatus');
    }
});
```

### Script pour vérifier les statistiques d'expérience
```javascript
pm.test("Experience stats are present", function () {
    var jsonData = pm.response.json();
    
    pm.expect(jsonData.experienceStats).to.have.property('perfectMatches');
    pm.expect(jsonData.experienceStats).to.have.property('partialMatches');
    pm.expect(jsonData.experienceStats).to.have.property('noMatches');
    pm.expect(jsonData.experienceStats).to.have.property('totalMatches');
});
```

## Interprétation des résultats

### Score d'expérience élevé (0.9-1.0)
- L'agent a l'expérience requise ou légèrement plus
- Match parfait pour l'expérience

### Score d'expérience moyen (0.6-0.8)
- L'agent a plus d'expérience que requis
- Peut être overqualified mais acceptable

### Score d'expérience faible (0.0-0.5)
- L'agent n'a pas assez d'expérience
- Match insuffisant pour l'expérience

## Conseils d'utilisation

1. **Commencez par les poids par défaut** pour avoir une base de référence
2. **Ajustez les poids selon vos priorités** métier
3. **Testez différents scénarios** pour trouver le bon équilibre
4. **Surveillez les statistiques** pour comprendre l'impact des poids
5. **Documentez vos choix** de poids pour la cohérence