# Exemples Postman pour le Système d'Enrôlement

## Configuration de Base

**Base URL**: `http://localhost:5000/api`

## 1. Envoyer une Invitation d'Enrôlement

### POST /enrollment/invite

**Description**: Envoie une invitation d'enrôlement à un agent pour un gig spécifique.

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "agentId": "507f1f77bcf86cd799439011",
  "gigId": "507f1f77bcf86cd799439012",
  "notes": "Opportunité exceptionnelle pour votre profil. Nous avons été impressionnés par vos compétences et nous pensons que ce gig vous conviendrait parfaitement.",
  "expiryDays": 10
}
```

**Réponse attendue**:
```json
{
  "message": "Invitation d'enrôlement envoyée avec succès",
  "gigAgent": {
    "id": "507f1f77bcf86cd799439013",
    "agentId": "507f1f77bcf86cd799439011",
    "gigId": "507f1f77bcf86cd799439012",
    "enrollmentStatus": "invited",
    "invitationExpiresAt": "2024-01-15T10:00:00.000Z",
    "invitationToken": "abc123def456..."
  }
}
```

## 2. Accepter une Invitation d'Enrôlement

### POST /enrollment/accept

**Description**: Permet à un agent d'accepter une invitation d'enrôlement via le token.

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "token": "abc123def456...",
  "notes": "Très intéressé par cette opportunité. Je suis disponible immédiatement et j'ai toutes les compétences requises."
}
```

**Réponse attendue**:
```json
{
  "message": "Enrôlement accepté avec succès",
  "gigAgent": {
    "id": "507f1f77bcf86cd799439013",
    "agentId": "507f1f77bcf86cd799439011",
    "gigId": "507f1f77bcf86cd799439012",
    "enrollmentStatus": "accepted",
    "status": "accepted",
    "enrollmentDate": "2024-01-08T10:00:00.000Z"
  }
}
```

## 3. Refuser une Invitation d'Enrôlement

### POST /enrollment/reject

**Description**: Permet à un agent de refuser une invitation d'enrôlement via le token.

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "token": "abc123def456...",
  "notes": "Merci pour cette opportunité, mais je ne suis pas disponible actuellement. J'espère pouvoir collaborer à l'avenir."
}
```

**Réponse attendue**:
```json
{
  "message": "Enrôlement refusé",
  "gigAgent": {
    "id": "507f1f77bcf86cd799439013",
    "agentId": "507f1f77bcf86cd799439011",
    "gigId": "507f1f77bcf86cd799439012",
    "enrollmentStatus": "rejected",
    "status": "rejected",
    "enrollmentNotes": "Merci pour cette opportunité, mais je ne suis pas disponible actuellement. J'espère pouvoir collaborer à l'avenir."
  }
}
```

## 4. Consulter les Enrôlements d'un Agent

### GET /enrollment/agent/{agentId}

**Description**: Récupère tous les enrôlements d'un agent spécifique.

**URL**: `/enrollment/agent/507f1f77bcf86cd799439011`

**Query Parameters** (optionnels):
```
?status=invited
?status=accepted
?status=rejected
?status=expired
```

**Réponse attendue**:
```json
{
  "count": 2,
  "enrollments": [
    {
      "id": "507f1f77bcf86cd799439013",
      "gig": {
        "title": "Développeur Full-Stack Senior",
        "description": "Développement d'applications web modernes",
        "category": "Développement",
        "destination_zone": "FR"
      },
      "enrollmentStatus": "invited",
      "invitationSentAt": "2024-01-08T10:00:00.000Z",
      "invitationExpiresAt": "2024-01-15T10:00:00.000Z",
      "isExpired": false,
      "canEnroll": true,
      "notes": "Opportunité exceptionnelle pour votre profil",
      "matchScore": 0.85,
      "matchStatus": "partial_match"
    },
    {
      "id": "507f1f77bcf86cd799439014",
      "gig": {
        "title": "Chef de Projet IT",
        "description": "Gestion de projets informatiques complexes",
        "category": "Gestion de Projet",
        "destination_zone": "FR"
      },
      "enrollmentStatus": "accepted",
      "invitationSentAt": "2024-01-05T10:00:00.000Z",
      "invitationExpiresAt": "2024-01-12T10:00:00.000Z",
      "isExpired": false,
      "canEnroll": false,
      "notes": "Projet très intéressant",
      "matchScore": 0.92,
      "matchStatus": "perfect_match"
    }
  ]
}
```

## 5. Consulter les Enrôlements d'un Gig

### GET /enrollment/gig/{gigId}

**Description**: Récupère tous les enrôlements pour un gig spécifique.

**URL**: `/enrollment/gig/507f1f77bcf86cd799439012`

**Query Parameters** (optionnels):
```
?status=invited
?status=accepted
?status=rejected
?status=expired
```

**Réponse attendue**:
```json
{
  "count": 3,
  "enrollments": [
    {
      "id": "507f1f77bcf86cd799439013",
      "agent": {
        "personalInfo": {
          "firstName": "Jean",
          "lastName": "Dupont",
          "email": "jean.dupont@email.com",
          "phone": "+33123456789"
        }
      },
      "enrollmentStatus": "invited",
      "invitationSentAt": "2024-01-08T10:00:00.000Z",
      "invitationExpiresAt": "2024-01-15T10:00:00.000Z",
      "isExpired": false,
      "notes": "Opportunité exceptionnelle pour votre profil",
      "matchScore": 0.85,
      "matchStatus": "partial_match"
    },
    {
      "id": "507f1f77bcf86cd799439015",
      "agent": {
        "personalInfo": {
          "firstName": "Marie",
          "lastName": "Martin",
          "email": "marie.martin@email.com",
          "phone": "+33987654321"
        }
      },
      "enrollmentStatus": "accepted",
      "invitationSentAt": "2024-01-07T10:00:00.000Z",
      "invitationExpiresAt": "2024-01-14T10:00:00.000Z",
      "isExpired": false,
      "notes": "Profil parfait pour ce poste",
      "matchScore": 0.95,
      "matchStatus": "perfect_match"
    }
  ]
}
```

## 6. Renvoyer une Invitation d'Enrôlement

### POST /enrollment/{id}/resend

**Description**: Renvoie une invitation d'enrôlement avec un nouveau token et une nouvelle date d'expiration.

**URL**: `/enrollment/507f1f77bcf86cd799439013/resend`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "expiryDays": 14
}
```

**Réponse attendue**:
```json
{
  "message": "Invitation d'enrôlement renvoyée avec succès",
  "gigAgent": {
    "id": "507f1f77bcf86cd799439013",
    "invitationToken": "def456ghi789...",
    "invitationExpiresAt": "2024-01-22T10:00:00.000Z"
  }
}
```

## 7. Annuler une Invitation d'Enrôlement

### POST /enrollment/{id}/cancel

**Description**: Annule une invitation d'enrôlement en attente.

**URL**: `/enrollment/507f1f77bcf86cd799439013/cancel`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "notes": "Poste pourvu par un autre candidat"
}
```

**Réponse attendue**:
```json
{
  "message": "Invitation d'enrôlement annulée avec succès",
  "gigAgent": {
    "id": "507f1f77bcf86cd799439013",
    "enrollmentStatus": "cancelled",
    "status": "cancelled"
  }
}
```

## Gestion des Erreurs

### Erreur 400 - Bad Request
```json
{
  "message": "Token d'invitation requis"
}
```

### Erreur 404 - Not Found
```json
{
  "message": "Invitation invalide"
}
```

### Erreur 410 - Gone (Expirée)
```json
{
  "message": "Cette invitation a expiré"
}
```

### Erreur 500 - Internal Server Error
```json
{
  "message": "Erreur lors de l'envoi de l'email d'invitation"
}
```

## Tests de Validation

### Test avec Token Invalide
1. Utilisez un token inexistant dans `/enrollment/accept`
2. Vérifiez que vous recevez une erreur 404

### Test avec Invitation Expirée
1. Créez une invitation avec une date d'expiration passée
2. Essayez de l'accepter
3. Vérifiez que vous recevez une erreur 410

### Test de Validation des Champs
1. Envoyez une invitation sans `agentId` ou `gigId`
2. Vérifiez que vous recevez une erreur 400

## Variables d'Environnement Postman

Créez les variables suivantes dans votre collection Postman :

```
base_url: http://localhost:5000/api
agent_id: 507f1f77bcf86cd799439011
gig_id: 507f1f77bcf86cd799439012
invitation_token: abc123def456...
```

## Collection Postman

Vous pouvez importer cette collection dans Postman en créant un fichier JSON avec tous ces exemples. N'oubliez pas de configurer les variables d'environnement et d'adapter les IDs selon votre base de données.
