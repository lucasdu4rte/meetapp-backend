import User from '../models/User';

class ProviderController {
  async index(req, res) {
    const providers = await User.findAll({
      where: { provider: true },
      attributes: ['id', 'name', 'email'],
    });
    return res.json(providers);
  }
}

export default new ProviderController();
