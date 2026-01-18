-- PostgreSQL LISTEN/NOTIFY Setup Script
-- Run this script after the 'rules' table has been created by Hibernate
-- 
-- Usage:
--   psql -U postgres -d cep_rules -f setup-postgres-trigger.sql

-- Create function to notify on rule changes
CREATE OR REPLACE FUNCTION notify_rule_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM pg_notify('rule_changes', 'INSERT:' || NEW.id || ':' || NEW.name);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM pg_notify('rule_changes', 'UPDATE:' || NEW.id || ':' || NEW.name);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM pg_notify('rule_changes', 'DELETE:' || OLD.id || ':' || OLD.name);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS rule_change_trigger ON rules;

-- Create trigger on rules table
CREATE TRIGGER rule_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON rules
FOR EACH ROW
EXECUTE FUNCTION notify_rule_change();

-- Verify trigger was created
SELECT 
    tgname AS trigger_name,
    tgtype AS trigger_type,
    tgenabled AS enabled
FROM pg_trigger 
WHERE tgname = 'rule_change_trigger';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'PostgreSQL trigger setup completed successfully!';
    RAISE NOTICE 'The CEP Engine will now receive instant notifications on rule changes.';
END $$;
