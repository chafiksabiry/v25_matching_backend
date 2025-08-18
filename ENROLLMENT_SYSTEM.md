# Système d'Enrôlement d'Agents dans les Gigs

## Vue d'ensemble

Le système d'enrôlement permet d'inviter des agents à rejoindre des gigs spécifiques. Les agents reçoivent des invitations par email et peuvent accepter ou refuser via un lien sécurisé ou via les notifications de la plateforme.

## Fonctionnalités

### 1. Envoi d'Invitations
- **Endpoint**: `POST /api/enrollment/invite`
- **Fonctionnalité**: Envoie une invitation d'enrôlement à un agent pour un gig spécifique
- **Paramètres**:
  ```json
  {
    "agentId": "ID_DE_L_AGENT",
    "gigId": "ID_DU_GIG",
    "notes": "Notes optionnelles",
    "expiryDays": 7
  }
  ```

### 2. Acceptation d'Enrôlement
- **Endpoint**: `POST /api/enrollment/accept`
- **Fonctionnalité**: Permet à un agent d'accepter une invitation d'enrôlement
- **Paramètres**:
  ```json
  {
    "token": "TOKEN_D_INVITATION",
    "notes": "Notes optionnelles"
  }
  ```

### 3. Refus d'Enrôlement
- **Endpoint**: `POST /api/enrollment/reject`
- **Fonctionnalité**: Permet à un agent de refuser une invitation d'enrôlement
- **Paramètres**:
  ```json
  {
    "token": "TOKEN_D_INVITATION",
    "notes": "Raison du refus (optionnel)"
  }
  ```

### 4. Consultation des Enrôlements
- **Pour un agent**: `GET /api/enrollment/agent/:agentId?status=invited`
- **Pour un gig**: `GET /api/enrollment/gig/:gigId?status=invited`

### 5. Gestion des Invitations
- **Renvoi**: `POST /api/enrollment/:id/resend`
- **Annulation**: `POST /api/enrollment/:id/cancel`

## Modèle de Données

### Champs Ajoutés au Modèle GigAgent

```javascript
// Statut d'enrôlement
enrollmentStatus: {
  type: String,
  enum: ['invited', 'accepted', 'rejected', 'expired'],
  default: 'invited'
},

// Informations d'invitation
invitationSentAt: Date,
invitationExpiresAt: Date,
invitationToken: String, // Token unique pour l'invitation

// Notes d'enrôlement
enrollmentNotes: String,
enrollmentDate: Date
```

## Flux d'Enrôlement

### 1. Création de l'Invitation
1. L'administrateur ou le système crée une invitation
2. Un token unique est généré
3. Une date d'expiration est définie (7 jours par défaut)
4. Un email d'invitation est envoyé à l'agent

### 2. Réponse de l'Agent
1. L'agent reçoit l'email avec un lien d'invitation
2. Il clique sur le lien et est redirigé vers la plateforme
3. Il peut accepter ou refuser l'invitation
4. Une notification de confirmation est envoyée

### 3. Gestion des Expirations
- Les invitations expirées sont automatiquement marquées comme "expired"
- Les agents ne peuvent plus répondre aux invitations expirées
- Les invitations peuvent être renvoyées avec une nouvelle date d'expiration

## Emails

### Email d'Invitation
- **Sujet**: "🎯 Invitation d'enrôlement: [Titre du Gig]"
- **Contenu**: 
  - Salutation personnalisée
  - Détails du gig
  - Bouton d'action pour accepter
  - Date d'expiration
  - Informations de contact

### Email de Confirmation
- **Sujet**: "📧 Confirmation d'enrôlement: [Titre du Gig]"
- **Contenu**:
  - Statut de la réponse (accepté/refusé)
  - Détails du gig
  - Prochaines étapes

## Sécurité

- **Tokens uniques**: Chaque invitation a un token unique et sécurisé
- **Expiration automatique**: Les invitations expirent automatiquement
- **Validation**: Vérification que l'invitation est toujours valide avant traitement
- **Audit trail**: Toutes les actions sont enregistrées avec horodatage

## Utilisation

### Exemple d'Envoi d'Invitation

```javascript
const response = await fetch('/api/enrollment/invite', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    agentId: '507f1f77bcf86cd799439011',
    gigId: '507f1f77bcf86cd799439012',
    notes: 'Opportunité exceptionnelle pour votre profil',
    expiryDays: 10
  })
});

const result = await response.json();
console.log('Invitation envoyée:', result);
```

### Exemple d'Acceptation d'Enrôlement

```javascript
const response = await fetch('/api/enrollment/accept', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    token: 'abc123def456...',
    notes: 'Très intéressé par cette opportunité'
  })
});

const result = await response.json();
console.log('Enrôlement accepté:', result);
```

## Statuts Possibles

- **`invited`**: Invitation envoyée, en attente de réponse
- **`accepted`**: Enrôlement accepté par l'agent
- **`rejected`**: Enrôlement refusé par l'agent
- **`expired`**: Invitation expirée
- **`cancelled`**: Invitation annulée par l'administrateur

## Gestion des Erreurs

- **Token invalide**: Retourne une erreur 404
- **Invitation expirée**: Retourne une erreur 410 (Gone)
- **Statut invalide**: Retourne une erreur 400
- **Erreur serveur**: Retourne une erreur 500

## Configuration

### Variables d'Environnement

```env
FRONTEND_URL=http://localhost:3000
BREVO_API_KEY=your_brevo_api_key
BREVO_FROM_EMAIL=noreply@harx.ai
BREVO_FROM_NAME=HARX Technologies
```

### Personnalisation des Emails

Les templates d'emails peuvent être personnalisés en modifiant les fonctions dans `src/services/emailService.js`:
- `createEnrollmentEmailContent()`: Email d'invitation HTML
- `createEnrollmentTextVersion()`: Email d'invitation texte
- `createEnrollmentNotificationContent()`: Notification de confirmation HTML
- `createEnrollmentNotificationTextVersion()`: Notification de confirmation texte

## Maintenance

### Nettoyage Automatique

Il est recommandé de créer un job cron pour :
- Marquer les invitations expirées
- Nettoyer les anciens tokens
- Archiver les enrôlements terminés

### Monitoring

Surveiller :
- Taux d'acceptation des invitations
- Temps de réponse des agents
- Taux d'expiration des invitations
- Performance des envois d'emails
