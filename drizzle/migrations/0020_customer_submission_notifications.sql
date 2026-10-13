CREATE OR REPLACE FUNCTION public.notify_customer_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    INSERT INTO public.notifications (user_id,title,body,kind)
    VALUES (NEW.user_id, 'Order #' || NEW.order_code || ' is now pending', NEW.service_name || ' × ' || NEW.quantity, 'notification');
  ELSIF TG_TABLE_NAME = 'deposits' THEN
    INSERT INTO public.notifications (user_id,title,body,kind)
    VALUES (NEW.user_id, 'Add Fund #' || NEW.code || ' is now pending', NULL, 'notification');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_customer_submission() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER customer_order_submission_notification AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_customer_submission();
CREATE TRIGGER customer_deposit_submission_notification AFTER INSERT ON public.deposits FOR EACH ROW EXECUTE FUNCTION public.notify_customer_submission();