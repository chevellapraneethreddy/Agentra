# Initializer for prompt templates package.
# Registers base templates for default AI Employees.
from app.models import models

def get_base_template(role: str) -> str:
    """
    Returns the default system prompt template based on agent role.
    """
    from .operations import OPERATIONS_TEMPLATE
    from .marketing import MARKETING_TEMPLATE
    from .sales import SALES_TEMPLATE
    from .support import SUPPORT_TEMPLATE
    from .hr import HR_TEMPLATE
    from .finance import FINANCE_TEMPLATE
    
    mapping = {
        "operations": OPERATIONS_TEMPLATE,
        "marketing": MARKETING_TEMPLATE,
        "sales": SALES_TEMPLATE,
        "support": SUPPORT_TEMPLATE,
        "hr": HR_TEMPLATE,
        "finance": FINANCE_TEMPLATE
    }
    return mapping.get(role.lower(), "You are a helpful AI business employee.")
