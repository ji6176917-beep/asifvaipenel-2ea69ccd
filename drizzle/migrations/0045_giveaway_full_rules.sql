UPDATE public.giveaway_settings SET config = jsonb_set(config, '{rules}', to_jsonb('You must be a registered user of Apex SMM World.
Minimum Activity Requirement: your account must have at least 1 completed paid order to participate.
Single Claim: each reward can be claimed only once per user unless clearly stated otherwise.
One Account Only: creating multiple accounts is strictly prohibited. Accounts detected through IP/device fingerprinting or fraud signals will be banned and rewards forfeited.
Original & Public Content: submitted work must be original, public and remain visible online for at least 1 year.
Verification Timeline: verification takes 6–72 hours (manual review may take longer).
Manual Review: balance is added only after verification by our moderation team.
Disqualification: fake, duplicate, deleted or private posts will be disqualified and rewards cancelled.
Anti-Botting Notice: botting, view farming or artificial engagement will result in a permanent ban from the campaign.'::text)) WHERE id = 1;