# GigAgent API Documentation

## Vue d'ensemble

Le modèle GigAgent permet de gérer les assignations entre agents et gigs avec envoi automatique d'emails de notification via AWS SES.

## Endpoints disponibles

### 1. Créer une assignation GigAgent

**POST** `/api/gig-agents`

Crée une nouvelle assignation, calcule automatiquement le matching et envoie un email de notification à l'agent.

**Body (simplifié) :**
```json
{
  "agentId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "gigId": "64f1a2b3c4d5e6f7g8h9i0j2",
  "notes": "Excellent profil pour ce projet"
}
```

**Notes :**
- Seuls `agentId` et `gigId` sont obligatoires
- `notes` est optionnel
- Le système calcule automatiquement :
  - Le score de matching global
  - Les détails de correspondance des langues
  - Les détails de correspondance des compétences
  - Les détails de correspondance des horaires

**Response:**
```json
{
  "message": "Assignation créée avec succès",
  "gigAgent": {
    "_id": "64f1a2b3c4d5e6f7g8h9i0j3",
    "agentId": {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "personalInfo": {
        "name": "John Doe",
        "email": "john.doe@example.com"
      }
    },
    "gigId": {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j2",
      "title": "Développeur Full Stack",
      "description": "Projet de développement web"
    },
    "status": "pending",
    "matchScore": 0.85,
    "matchDetails": {
      "languageMatch": {
        "score": 0.9,
        "details": {
          "matchingLanguages": [],
          "missingLanguages": [],
          "insufficientLanguages": [],
          "matchStatus": "perfect_match"
        }
      },
      "skillsMatch": {
        "details": {
          "matchingSkills": [],
          "missingSkills": [],
          "insufficientSkills": [],
          "matchStatus": "perfect_match"
        }
      },
      "scheduleMatch": {
        "score": 0.8,
        "details": {
          "matchingDays": [],
          "missingDays": [],
          "insufficientHours": []
        },
        "matchStatus": "perfect_match"
      }
    },
    "emailSent": true,
    "emailSentAt": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "emailSent": true,
  "matchScore": 0.85
}
```

### 2. Créer une assignation à partir des résultats de matching

**POST** `/api/matches/create-gig-agent`

Crée une assignation GigAgent directement à partir des résultats de matching existants.

**Body:**
```json
{
  "gigId": "64f1a2b3c4d5e6f7g8h9i0j2",
  "agentId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "matchDetails": {
    "languageMatch": {
      "score": 0.9,
      "details": {
        "matchingLanguages": [],
        "missingLanguages": [],
        "insufficientLanguages": [],
        "matchStatus": "perfect_match"
      }
    },
    "skillsMatch": {
      "details": {
        "matchingSkills": [],
        "missingSkills": [],
        "insufficientSkills": [],
        "matchStatus": "perfect_match"
      }
    },
    "scheduleMatch": {
      "score": 0.8,
      "matchStatus": "perfect_match"
    }
  },
  "notes": "Assignation créée depuis les résultats de matching"
}
```

### 3. Obtenir toutes les assignations

**GET** `/api/gig-agents`

Retourne toutes les assignations avec les détails des agents et gigs.

### 4. Obtenir une assignation par ID

**GET** `/api/gig-agents/:id`

Retourne une assignation spécifique avec les détails complets.

### 5. Obtenir les assignations d'un agent

**GET** `/api/gig-agents/agent/:agentId`

Retourne toutes les assignations pour un agent spécifique.

### 6. Obtenir les assignations d'un gig

**GET** `/api/gig-agents/gig/:gigId`

Retourne toutes les assignations pour un gig spécifique.

### 7. Mettre à jour une assignation

**PUT** `/api/gig-agents/:id`

Met à jour le statut ou les notes d'une assignation.

**Body:**
```json
{
  "status": "accepted",
  "notes": "L'agent a accepté le projet",
  "agentResponse": "accepted"
}
```

### 8. Renvoyer l'email de notification

**POST** `/api/gig-agents/:id/resend-email`

Renvoye l'email de notification à l'agent.

### 9. Obtenir les assignations par statut

**GET** `/api/gig-agents/status/:status`

Retourne toutes les assignations avec un statut spécifique (pending, accepted, rejected, completed, cancelled).

### 10. Obtenir les statistiques

**GET** `/api/gig-agents/stats`

Retourne les statistiques des assignations.

**Response:**
```json
{
  "total": 150,
  "emailSent": 145,
  "pendingResponse": 120,
  "byStatus": {
    "pending": 120,
    "accepted": 20,
    "rejected": 8,
    "completed": 2
  }
}
```

### 11. Supprimer une assignation

**DELETE** `/api/gig-agents/:id`

Supprime une assignation.

## Statuts disponibles

- `pending` : En attente de réponse de l'agent
- `accepted` : Accepté par l'agent
- `rejected` : Refusé par l'agent
- `completed` : Projet terminé
- `cancelled` : Annulé

## Configuration AWS SES

Assurez-vous que les variables d'environnement suivantes sont configurées :

```env
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_SES_FROM_EMAIL=your_verified_email@domain.com
```

## Gestion des erreurs

- **409 Conflict** : Une assignation existe déjà pour cet agent et ce gig
- **404 Not Found** : Agent ou gig non trouvé
- **400 Bad Request** : Données invalides
- **500 Internal Server Error** : Erreur lors de l'envoi d'email

## Notes importantes

1. **Simplification** : Seuls `agentId` et `gigId` sont nécessaires dans le body
2. **Calcul automatique** : Le système calcule automatiquement tous les scores et détails de matching
3. **Email automatique** : L'email est envoyé automatiquement lors de la création
4. **Assignation unique** : Une assignation unique est autorisée par paire agent-gig
5. **Gestion d'erreurs** : Les emails échoués n'empêchent pas la création de l'assignation
6. **Statut initial** : Le statut initial est toujours "pending"

## Exemple de test Postman

**POST** `http://localhost:5000/api/gig-agents`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "agentId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "gigId": "64f1a2b3c4d5e6f7g8h9i0j2"
}
```

C'est tout ! Le système fera le reste automatiquement. 