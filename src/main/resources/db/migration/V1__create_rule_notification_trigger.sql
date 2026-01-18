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

-- Create trigger on rules table
DROP TRIGGER IF EXISTS rule_change_trigger ON rules;
CREATE TRIGGER rule_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON rules
FOR EACH ROW
EXECUTE FUNCTION notify_rule_change();
