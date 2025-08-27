# API de Demande d'Enrôlement par Agent

Ce document décrit les nouveaux endpoints permettant à un agent de demander à s'enrôler à un gig, et à la company d'accepter ou refuser cette demande.

## Vue d'ensemble

Le système d'enrôlement a été étendu pour permettre aux agents de prendre l'initiative de demander un enrôlement à un gig, plutôt que d'attendre une invitation de la company.

## Nouveaux Statuts d'Enrôlement

- `invited` : L'agent a reçu une invitation de la company
- `requested` : L'agent a demandé un enrôlement (nouveau statut)
- `accepted` : L'enrôlement a été accepté
- `rejected` : L'enrôlement a été refusé
- `expired` : L'invitation a expiré

## Endpoints

### 1. Demander un Enrôlement (Agent)

**POST** `/enrollment/request`

Permet à un agent de demander à s'enrôler à un gig.

**Body:**
```json
{
  "agentId": "507f1f77bcf86cd799439011",
  "gigId": "507f1f77bcf86cd799439012",
  "notes": "Je suis très intéressé par ce projet et j'ai une expérience pertinente."
}
```

**Réponse de succès (201):**
```json
{
  "message": "Demande d'enrôlement envoyée avec succès",
  "gigAgent": {
    "id": "507f1f77bcf86cd799439013",
    "agentId": "507f1f77bcf86cd799439011",
    "gigId": "507f1f77bcf86cd799439012",
    "enrollmentStatus": "requested",
    "status": "pending",
    "enrollmentNotes": "Je suis très intéressé par ce projet et j'ai une expérience pertinente."
  }
}
```

### 2. Accepter une Demande d'Enrôlement (Company)

**POST** `/enrollment/request/accept`

Permet à la company d'accepter une demande d'enrôlement d'un agent.

**Body:**
```json
{
  "enrollmentId": "507f1f77bcf86cd799439013",
  "notes": "Bienvenue dans l'équipe ! Nous sommes ravis de vous avoir."
}
```

**Réponse de succès (200):**
```json
{
  "message": "Demande d'enrôlement acceptée avec succès",
  "gigAgent": {
    "id": "507f1f77bcf86cd799439013",
    "agentId": "507f1f77bcf86cd799439011",
    "gigId": "507f1f77bcf86cd799439012",
    "enrollmentStatus": "accepted",
    "status": "accepted",
    "enrollmentDate": "2024-01-15T10:30:00.000Z",
    "enrollmentNotes": "Bienvenue dans l'équipe ! Nous sommes ravis de vous avoir."
  }
}
```

### 3. Refuser une Demande d'Enrôlement (Company)

**POST** `/enrollment/request/reject`

Permet à la company de refuser une demande d'enrôlement d'un agent.

**Body:**
```json
{
  "enrollmentId": "507f1f77bcf86cd799439013",
  "notes": "Merci pour votre intérêt, mais nous avons déjà sélectionné un autre candidat."
}
```

**Réponse de succès (200):**
```json
{
  "message": "Demande d'enrôlement refusée",
  "gigAgent": {
    "id": "507f1f77bcf86cd799439013",
    "agentId": "507f1f77bcf86cd799439011",
    "gigId": "507f1f77bcf86cd799439012",
    "enrollmentStatus": "rejected",
    "status": "rejected",
    "enrollmentNotes": "Merci pour votre intérêt, mais nous avons déjà sélectionné un autre candidat."
  }
}
```

## Règles Métier

### Pour les Agents

1. **Nouvelle demande** : Un agent peut demander un enrôlement s'il n'y a pas déjà une demande active
2. **Nouvelle tentative** : Un agent peut faire une nouvelle demande si sa demande précédente a été refusée, expirée ou annulée
3. **Demande existante** : Un agent ne peut pas modifier une demande déjà en cours

### Pour les Companies

1. **Acceptation** : Seules les demandes avec le statut `requested` peuvent être acceptées
2. **Refus** : Seules les demandes avec le statut `requested` peuvent être refusées
3. **Notification** : L'agent reçoit automatiquement une notification par email lors de l'acceptation ou du refus

## Flux de Travail

### Scénario 1 : Demande d'Enrôlement
1. L'agent découvre un gig intéressant
2. L'agent envoie une demande d'enrôlement via l'API
3. La company reçoit la demande et peut l'examiner
4. La company accepte ou refuse la demande

### Scénario 2 : Invitation d'Enrôlement (flux existant)
1. La company identifie un agent intéressant
2. La company envoie une invitation d'enrôlement
3. L'agent reçoit l'invitation et peut l'accepter ou la refuser

## Gestion des Erreurs

### Erreurs Communes

- **400 Bad Request** : Données manquantes ou invalides
- **404 Not Found** : Agent, gig ou enrôlement non trouvé
- **409 Conflict** : Demande d'enrôlement déjà existante
- **500 Internal Server Error** : Erreur serveur

### Validation

- L'agent et le gig doivent exister
- Un agent ne peut pas avoir plusieurs demandes actives pour le même gig
- Seules les demandes avec le statut approprié peuvent être traitées

## Intégration avec le Système Existant

Ces nouveaux endpoints s'intègrent parfaitement avec le système d'enrôlement existant :

- Utilisent les mêmes modèles de données
- Respectent la même logique de validation
- Envoient les mêmes notifications par email
- Maintiennent la cohérence des statuts

## Exemples d'Utilisation

### Frontend Agent
```javascript
// Demander un enrôlement
const response = await fetch('/enrollment/request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentId: 'agent123',
    gigId: 'gig456',
    notes: 'Je suis parfaitement qualifié pour ce projet.'
  })
});
```

### Frontend Company
```javascript
// Accepter une demande
const response = await fetch('/enrollment/request/accept', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    enrollmentId: 'enrollment789',
    notes: 'Bienvenue dans l\'équipe !'
  })
});
```

## Sécurité et Permissions

- Les endpoints nécessitent une authentification appropriée
- Seuls les agents peuvent faire des demandes d'enrôlement
- Seules les companies propriétaires des gigs peuvent accepter/refuser les demandes
- Validation des permissions au niveau de l'application
