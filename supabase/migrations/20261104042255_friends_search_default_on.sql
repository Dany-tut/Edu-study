begin;
-- Enable discovery for new profiles and existing accounts at this rollout.
-- Later explicit opt-outs remain supported by the save action.
alter table iskra_social.people alter column searchable set default true;
update iskra_social.people set searchable = true where not searchable;
commit;
