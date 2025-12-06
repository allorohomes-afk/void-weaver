import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const skillsData = [
  {
    "key": "grounding_1",
    "name": "Steady Breath",
    "category": "grounding",
    "tier": 1,
    "description": "Mastery of simple breathwork to stabilize in the moment.",
    "unlock_requirements": { "counts": { "grounding_choice": 2 }, "energies": { "feminine_energy": 10 } },
    "effects": { "stats": { "care": 1, "presence": 1 } },
    "cinematic_modifier": "The Warden appears centered and breathing calmly."
  },
  {
    "key": "grounding_2",
    "name": "Anchor in Stress",
    "category": "grounding",
    "tier": 2,
    "description": "Ability to remain immovable in the face of chaos.",
    "unlock_requirements": { "counts": { "grounding_choice": 5, "tense_reaction": 2 }, "stats": { "presence": 10 } },
    "effects": { "stats": { "presence": 2, "resolve": 1 }, "energies": { "masculine_energy": 2 } },
    "cinematic_modifier": "The Warden stands rooted like a stone against the tide."
  },
  {
    "key": "grounding_3",
    "name": "Calm Presence Field",
    "category": "grounding",
    "tier": 3,
    "description": "Radiate a calm that stabilizes others nearby.",
    "unlock_requirements": { "counts": { "grounding_choice": 10 }, "stats": { "presence": 20, "care": 15 } },
    "effects": { "stats": { "presence": 3, "care": 2 }, "political": { "lantern_influence": 2 } },
    "cinematic_modifier": "A subtle aura of stillness surrounds the Warden, calming the air."
  },
  {
    "key": "relational_1",
    "name": "Soft Listening",
    "category": "relational",
    "tier": 1,
    "description": "Listen to understand, not to respond.",
    "unlock_requirements": { "counts": { "relational_choice": 2 }, "stats": { "care": 5 } },
    "effects": { "stats": { "care": 2 } },
    "cinematic_modifier": "The Warden leans in slightly, expression open and attentive."
  },
  {
    "key": "relational_2",
    "name": "Holding Emotional Space",
    "category": "relational",
    "tier": 2,
    "description": "Create safety for others to express difficult emotions.",
    "unlock_requirements": { "counts": { "relational_choice": 5, "soft_reaction": 2 }, "energies": { "feminine_energy": 20 } },
    "effects": { "stats": { "care": 2, "insight": 1 }, "energies": { "feminine_energy": 2 }, "political": { "public_sentiment": 1 } },
    "cinematic_modifier": "The Warden's posture creates a protective, listening sphere."
  },
  {
    "key": "relational_3",
    "name": "Empathic Leadership",
    "category": "relational",
    "tier": 3,
    "description": "Lead through connection and shared vulnerability.",
    "unlock_requirements": { "counts": { "relational_choice": 10 }, "stats": { "care": 20, "presence": 15 } },
    "effects": { "stats": { "care": 3, "presence": 2 }, "political": { "public_sentiment": 3 } },
    "cinematic_modifier": "The Warden leads with an open heart, inspiring trust."
  },
  {
    "key": "critical_1",
    "name": "Spot Inconsistencies",
    "category": "critical_thought",
    "tier": 1,
    "description": "Notice when words don't match actions.",
    "unlock_requirements": { "counts": { "clue_analysis": 2 }, "stats": { "insight": 5 } },
    "effects": { "stats": { "insight": 2 } },
    "cinematic_modifier": "The Warden's eyes are sharp, scanning details."
  },
  {
    "key": "critical_2",
    "name": "Recognize Coercion Patterns",
    "category": "critical_thought",
    "tier": 2,
    "description": "Identify manipulation tactics in real-time.",
    "unlock_requirements": { "counts": { "clue_analysis": 5, "lie_detected": 2 }, "stats": { "insight": 12 } },
    "effects": { "stats": { "insight": 2, "resolve": 1 }, "political": { "old_guard_pressure": 1 } },
    "cinematic_modifier": "The Warden looks skeptical and observant."
  },
  {
    "key": "critical_3",
    "name": "Expose Hidden Agendas",
    "category": "critical_thought",
    "tier": 3,
    "description": "Reveal the structures of power behind the immediate conflict.",
    "unlock_requirements": { "counts": { "clue_analysis": 10, "lie_detected": 5 }, "stats": { "insight": 20 } },
    "effects": { "stats": { "insight": 4 }, "political": { "brotherhood_shadow": -2, "old_guard_pressure": 2 } },
    "cinematic_modifier": "The Warden stands with piercing clarity, cutting through illusions."
  },
  {
    "key": "protector_1",
    "name": "Safe Positioning",
    "category": "protector_stance",
    "tier": 1,
    "description": "Stand where you can intervene without threatening.",
    "unlock_requirements": { "counts": { "protector_choice": 2 }, "stats": { "presence": 5 } },
    "effects": { "stats": { "presence": 2 }, "energies": { "masculine_energy": 5 } },
    "cinematic_modifier": "The Warden stands at a safe angle, ready but relaxed."
  },
  {
    "key": "protector_2",
    "name": "Conflict Containment",
    "category": "protector_stance",
    "tier": 2,
    "description": "De-escalate violence through physical presence alone.",
    "unlock_requirements": { "counts": { "protector_choice": 5 }, "stats": { "presence": 15 } },
    "effects": { "stats": { "presence": 3, "resolve": 1 }, "energies": { "masculine_energy": 5 } },
    "cinematic_modifier": "The Warden's stance is stable and centered, creating a barrier of calm."
  },
  {
    "key": "protector_3",
    "name": "Force Neutralization Without Harm",
    "category": "protector_stance",
    "tier": 3,
    "description": "Stop aggression instantly without causing injury.",
    "unlock_requirements": { "counts": { "protector_choice": 10 }, "stats": { "presence": 25, "resolve": 20 } },
    "effects": { "stats": { "presence": 5, "resolve": 2 }, "political": { "lantern_influence": 2 } },
    "cinematic_modifier": "The Warden moves with fluid, non-violent power."
  },
  {
    "key": "social_1",
    "name": "Read Posture",
    "category": "social_awareness",
    "tier": 1,
    "description": "Decode body language basics.",
    "unlock_requirements": { "counts": { "social_choice": 2 }, "stats": { "insight": 5 } },
    "effects": { "stats": { "insight": 1, "care": 1 } },
    "cinematic_modifier": "The Warden watches body language closely."
  },
  {
    "key": "social_2",
    "name": "Spot Fear or Discomfort",
    "category": "social_awareness",
    "tier": 2,
    "description": "Notice the subtle signs of distress others miss.",
    "unlock_requirements": { "counts": { "social_choice": 5 }, "stats": { "insight": 10, "care": 10 } },
    "effects": { "stats": { "insight": 2, "care": 2 } },
    "cinematic_modifier": "The Warden's gaze focuses on the hands and eyes of others."
  },
  {
    "key": "social_3",
    "name": "Predict Escalation",
    "category": "social_awareness",
    "tier": 3,
    "description": "Know violence is coming before it happens.",
    "unlock_requirements": { "counts": { "social_choice": 10 }, "stats": { "insight": 20 } },
    "effects": { "stats": { "insight": 4 }, "political": { "old_guard_pressure": -1 } },
    "cinematic_modifier": "Camera angle captures tension lines in NPC posture."
  },
  {
    "key": "nd_1",
    "name": "Match Tone and Pace",
    "category": "nd_sensitivity",
    "tier": 1,
    "description": "Adjust your communication style to the listener.",
    "unlock_requirements": { "counts": { "relational_choice": 3 }, "stats": { "care": 5 } },
    "effects": { "stats": { "care": 2 } },
    "cinematic_modifier": "The Warden mirrors the posture of the person they are speaking to."
  },
  {
    "key": "nd_2",
    "name": "Interpret ND Signals",
    "category": "nd_sensitivity",
    "tier": 2,
    "description": "Understand stimming, avoiding eye contact, and sensory overload.",
    "unlock_requirements": { "counts": { "relational_choice": 6, "soft_reaction": 3 }, "stats": { "insight": 15 } },
    "effects": { "stats": { "insight": 2, "care": 2 }, "political": { "lantern_influence": 1 } },
    "cinematic_modifier": "The Warden gives space and lowers their visual intensity."
  },
  {
    "key": "nd_3",
    "name": "Neuro-Inclusive Leadership",
    "category": "nd_sensitivity",
    "tier": 3,
    "description": "Build teams that honor different minds.",
    "unlock_requirements": { "counts": { "relational_choice": 12 }, "stats": { "care": 25, "presence": 10 } },
    "effects": { "stats": { "care": 4, "presence": 2 }, "political": { "lantern_influence": 3 } },
    "cinematic_modifier": "The Warden creates a structured, calm environment for the group."
  },
  {
    "key": "peer_1",
    "name": "Hold Your Line",
    "category": "peer_resistance",
    "tier": 1,
    "description": "Refuse to join in on toxic behavior.",
    "unlock_requirements": { "counts": { "peer_choice": 2 }, "stats": { "resolve": 5 } },
    "effects": { "stats": { "resolve": 2, "integrity": 1 } },
    "cinematic_modifier": "The Warden stands slightly apart from the group, firm."
  },
  {
    "key": "peer_2",
    "name": "Resist Toxic Bonding",
    "category": "peer_resistance",
    "tier": 2,
    "description": "Reject connection based on shared cruelty.",
    "unlock_requirements": { "counts": { "peer_choice": 5 }, "stats": { "resolve": 12, "integrity": 10 } },
    "effects": { "stats": { "resolve": 3, "integrity": 2 }, "political": { "brotherhood_shadow": -1 } },
    "cinematic_modifier": "The Warden's face shows a quiet refusal."
  },
  {
    "key": "peer_3",
    "name": "Shift Male Group Dynamics",
    "category": "peer_resistance",
    "tier": 3,
    "description": "Change the culture of a group from within.",
    "unlock_requirements": { "counts": { "peer_choice": 10 }, "stats": { "resolve": 20, "integrity": 20, "presence": 15 } },
    "effects": { "stats": { "resolve": 4, "presence": 3 }, "political": { "brotherhood_shadow": -3 } },
    "cinematic_modifier": "The Warden stands in the center, changing the energy of the room."
  },
  {
    "key": "self_1",
    "name": "Name Your Emotion",
    "category": "self_insight",
    "tier": 1,
    "description": "Identify what you are feeling.",
    "unlock_requirements": { "counts": { "emotional_choice": 2 }, "stats": { "insight": 5 } },
    "effects": { "stats": { "insight": 1, "fear_freeze": -1 } },
    "cinematic_modifier": "The Warden looks introspective."
  },
  {
    "key": "self_2",
    "name": "Map Your Triggers",
    "category": "self_insight",
    "tier": 2,
    "description": "Know what sets you off before it happens.",
    "unlock_requirements": { "counts": { "emotional_choice": 5 }, "stats": { "insight": 12, "integrity": 5 } },
    "effects": { "stats": { "insight": 2, "integrity": 2, "fear_freeze": -2 } },
    "cinematic_modifier": "The Warden pauses, recognizing a pattern."
  },
  {
    "key": "self_3",
    "name": "Shadow Integration",
    "category": "self_insight",
    "tier": 3,
    "description": "Accept and align your darker impulses.",
    "unlock_requirements": { "counts": { "emotional_choice": 10 }, "stats": { "insight": 25, "integrity": 15 } },
    "effects": { "stats": { "insight": 5, "presence": 3 }, "energies": { "masculine_energy": 5, "feminine_energy": 5 } },
    "cinematic_modifier": "The Warden appears fully whole, shadow and light aligned."
  },
  {
    "key": "political_1",
    "name": "Gauge Faction Tension",
    "category": "political_awareness",
    "tier": 1,
    "description": "Feel the political temperature of a room.",
    "unlock_requirements": { "counts": { "critical_choice": 2, "social_choice": 2 }, "stats": { "insight": 8 } },
    "effects": { "stats": { "insight": 2 } },
    "cinematic_modifier": "The Warden observes the symbols and allegiances present."
  },
  {
    "key": "political_2",
    "name": "See Institutional Harm",
    "category": "political_awareness",
    "tier": 2,
    "description": "Recognize systemic issues over individual ones.",
    "unlock_requirements": { "counts": { "critical_choice": 6 }, "stats": { "insight": 15, "integrity": 10 } },
    "effects": { "stats": { "insight": 3, "integrity": 2 }, "political": { "lantern_influence": 2 } },
    "cinematic_modifier": "The Warden looks past the people to the structure itself."
  },
  {
    "key": "political_3",
    "name": "Predict Policy Consequences",
    "category": "political_awareness",
    "tier": 3,
    "description": "Understand the long-term ripple effects of decisions.",
    "unlock_requirements": { "counts": { "critical_choice": 12 }, "stats": { "insight": 25, "resolve": 15 } },
    "effects": { "stats": { "insight": 5, "presence": 3 }, "political": { "public_sentiment": 3 } },
    "cinematic_modifier": "The Warden gazes into the distance, seeing the future impact."
  }
];

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // Admin check or similar could be added
        
        // Remove existing skills to avoid duplicates (optional, but safer for re-seeding)
        // Note: SDK usually doesn't have bulk delete all easily without listing first.
        // We will just upsert logic: if key exists, update; else create.
        // But for simplicity in this script, we'll just check if key exists.

        const existing = await base44.entities.Skill.list();
        const existingMap = new Map(existing.map(s => [s.key, s]));
        
        const results = [];

        for (const skillData of skillsData) {
            if (existingMap.has(skillData.key)) {
                // Update
                const existingSkill = existingMap.get(skillData.key);
                await base44.entities.Skill.update(existingSkill.id, skillData);
                results.push(`Updated ${skillData.key}`);
            } else {
                // Create
                await base44.entities.Skill.create(skillData);
                results.push(`Created ${skillData.key}`);
            }
        }

        return Response.json({ status: 'success', results });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});