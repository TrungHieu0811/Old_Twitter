import { Request, Response, RequestHandler } from 'express';
import usersService from '~/services/users.services';

export const loginController: RequestHandler = (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (email === 'hieu@gmail.com' && password === '123') {
    res.json({
      message: 'Login successful'
    });
    return;
  }

  res.status(401).json({
    error: 'Invalid email or password'
  });
};

export const registerController: RequestHandler = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const result = await usersService.register({ email, password });

    res.status(201).json({
      message: 'User registered successfully',
      result
    });

    return;
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(400).json({
      error: 'An error occurred while registering the user'
    });
    return;
  }
};
