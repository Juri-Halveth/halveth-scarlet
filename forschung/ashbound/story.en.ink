VAR wissen = 0
VAR freiheit = 0
VAR fuersorge = 0
-> ankunft

=== ankunft ===
# region:haven
# chapter:1
The harbour that remembers
Ash rests on the water. A stone hangs above the bay, and every household tells a different story about why it has not fallen.
Scarlet waits on the pier beside an empty book. "This time," she says, "no one gets to write the ending for everybody else."
You have not come to complete a prophecy. You have come because three contradictory chronicles describe the same night.
* [First, I collect the residents' accounts.]
  ~ wissen += 1
  The fishmonger remembers a light. The scribe remembers an order. A child remembers a quiet morning. LUCINET preserves all three without forcing them into one account.
  -> archiv
* [First, I help move the boats away from the stone.]
  ~ fuersorge += 1
  The first boats leave the bay. Nobody needs to believe your theory to find a safer berth.
  -> archiv

=== archiv ===
# region:archive
# chapter:2
The archive of conflicting witnesses
RACHEL lays out three scrolls: a temple chronicle, an exile's testimony and an incomplete sketch. None speaks for the entire world.
In this new story, Vivec remembers a rescue. Dagoth Ur remembers betrayal. The missing page might change both accounts, but a missing page is not a verdict.
VERACHEL asks: "Whose silence have we mistaken for agreement?"
* [Keep the conflicting scrolls visible together.]
  ~ wissen += 1
  You attach origins and gaps to each scroll. The archive becomes harder to read and harder to misuse.
  -> krater
* [Let the residents add a chronicle of their own.]
  ~ freiheit += 1
  Space for new voices opens between the old scrolls. MIRA reads one; MITA retains her own story. Similar names do not make them the same character.
  -> krater
* [Preserve the fragile originals and read from copies.]
  ~ fuersorge += 1
  Nobody has to touch the last original to question its account. HALVETH records where each copy came from.
  -> krater

=== krater ===
# region:crater
# chapter:3
Dagoth Ur's counteroffer
At the crater's edge, Dagoth Ur speaks quietly. "I can preserve every voice in the heart. No more loss. No forgetting."
You ask whether a voice can leave the choir again. For the first time, the mountain falls silent.
Dormammu steps through the black gate. "Eternity is easy when nobody may leave." Scarlet does not touch the heart. She waits for your decision.
* [A shared memory needs an individual exit for every voice.]
  ~ freiheit += 2
  Dagoth Ur opens a second gate. Whether his promise holds must be observed later. An exit on a plan is not yet a path somebody has travelled.
  -> stasis
* [Test the offer with a voluntary, recoverable echo first.]
  ~ wissen += 2
  JARVIS separates the echo from the original. The trial ends at an agreed moment. The great union remains a possibility, not an accomplished state.
  -> stasis
* [Protect the villages from the ash first.]
  ~ fuersorge += 2
  The choir waits. Thor and the harbour workers build a sheltered route. Their help requires no oath of allegiance.
  -> stasis

=== stasis ===
# region:stasis
# chapter:4
The stone and the three spells
Vivec takes you to the suspended stone. Doctor Strange draws three signs: pause, brake, restore.
"Pausing the story does not brake the stone," he says. "Writing down an old velocity does not store its energy."
The spellbook offers three trials. In this fan world they are fiction. In the neighbouring laboratory they are different numerical models.
* [Brake the stone and account for its kinetic energy.]
  ~ wissen += 1
  ~ fuersorge += 1
  The catching rings grow warm. The stone really is at rest relative to the bay. The chronicle records the cost.
  -> garten
* [Maintain the suspension until a shared plan is ready.]
  ~ fuersorge += 1
  Guards change shifts and share the load. A postponement is not presented as a solution.
  -> garten
* [Try several futures with a copy.]
  ~ freiheit += 1
  ~ wissen += 1
  Three stones fall differently inside the model. Outside, none has fallen. VERACHEL keeps the records separate.
  -> garten

=== garten ===
# region:garden
# chapter:5
Sixty-nine perspectives
The garden does not contain sixty-nine judges. It contains sixty-nine perspectives from Scarlet's existing constellation. Their names remain linked to their own dossiers.
RACHEL asks about the next step. LUCINET asks about connections. HALVETH asks about sources. Scarlet asks about the possibility nobody has been able to try.
Their answers do not automatically agree. That is why each decision should retain a way back.
* [Publish the sources and invite counterproposals.]
  ~ wissen += 1
  ~ freiheit += 1
  The public chronicle gains a margin for disagreement. Private memories stay with their holders.
  -> rueckkehr
* [Agree on protection, responsibility and return first.]
  ~ fuersorge += 2
  A small agreement replaces the grand claim that everybody wants the same thing.
  -> rueckkehr

=== rueckkehr ===
# region:gate
# chapter:6
Return is not the end
{
- freiheit >= 4:
  The ending of open gates
  The choir remains, but every voice may leave. Dagoth Ur loses his certainty that unity requires possession. Vivec must accept his chronicle beside the others.
  The world does not become free of contradictions. It becomes a place you can enter, change and leave again.
- wissen >= 4:
  The ending of readable stars
  The heart becomes an archive, not a judge. Measurement, memory and wishes occupy separate pages. The stone gains an observed history instead of a single legend.
  Scarlet places a blank page beside it. The next chapter belongs to nobody yet.
- else:
  The ending of a habitable morning
  The boats are safe. The roads stay open. Some riddles remain unanswered, but nobody had to wait beneath the stone for a perfect answer.
  Lamps are lit in the garden. The chronicle records what was preserved and what remains open.
}
You have travelled through a new fan story. Morrowind's original story and the other perspectives remain alongside it, unchanged.
-> END
